import { Controller, Get, Post, UseGuards, Req, Res, Body, UseFilters } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User, PartnerAccessStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DiscordAuthExceptionFilter } from './filters/discord-auth-exception.filter';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
    private prisma: PrismaService,
  ) {}

  @Get('discord')
  @UseFilters(DiscordAuthExceptionFilter)
  async discordLogin(@Req() req: Request, @Res() res: Response) {
    // Store login type in cookie before redirecting to Discord
    const state = (req.query as any).state || 'no_remember';
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log('[DiscordLogin] Setting auth_state cookie:', state);
    
    res.cookie('auth_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/', // Ensure cookie is available for callback
    });
    
    // Build Discord OAuth URL manually
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email');
    
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    return res.redirect(discordAuthUrl);
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  @UseFilters(DiscordAuthExceptionFilter)
  async discordCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Clear auth state cookie
    res.clearCookie('auth_state');
    
    // Check if this is a partner login
    if ((req as any).isPartnerLogin || (req.user as any)?.isPartnerLogin) {
      return this.handlePartnerCallback(req, res);
    }

    // Check if this is a taxi login
    if ((req as any).isTaxiLogin || (req.user as any)?.isTaxiLogin) {
      return this.handleTaxiCallback(req, res);
    }
    
    const user = req.user as User;
    
    // Check for rememberMe from request (set by discord strategy from state parameter)
    const rememberMe = (req as any).rememberMe === true;
    
    // Generate tokens with rememberMe option
    const tokens = await this.authService.generateTokens(user, { rememberMe });

    // Set HTTP-only cookies
    const accessTokenMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000; // 7 days or 1 hour
    const refreshTokenMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 30 days or 7 days

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction, // true for HTTPS in production
      sameSite: 'lax',
      maxAge: accessTokenMaxAge,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction, // true for HTTPS in production
      sameSite: 'lax',
      maxAge: refreshTokenMaxAge,
    });

    // Log the login
    await this.auditService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      meta: { method: 'discord', rememberMe },
    });

    // Redirect to frontend
    res.redirect(`${frontendUrl}/app`);
  }

  // Handle partner login callback
  private async handlePartnerCallback(req: Request, res: Response) {
    const partnerProfile = req.user as { 
      discordId: string; 
      username: string; 
      avatarUrl?: string; 
      email?: string;
      isPartnerLogin: boolean;
    };
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isProduction = process.env.NODE_ENV === 'production';

    console.log('[PartnerCallback] Processing partner:', partnerProfile.username, partnerProfile.discordId);

    // Prüfe ob bereits eine Partner-Anfrage existiert
    const existingRequest = await this.prisma.partnerAccessRequest.findUnique({
      where: { discordId: partnerProfile.discordId },
    });
    
    console.log('[PartnerCallback] Existing request:', existingRequest?.status || 'none');

    if (existingRequest?.status === PartnerAccessStatus.APPROVED) {
      // Partner hat bereits Zugang - einloggen
      let partnerUser = await this.prisma.user.findUnique({
        where: { discordId: partnerProfile.discordId },
      });

      if (partnerUser && (partnerUser as any).isPartner) {
        // Generate tokens for partner
        const tokens = await this.authService.generateTokens(partnerUser);

        res.cookie('access_token', tokens.accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 60 * 60 * 1000, // 1 hour
        });

        res.cookie('refresh_token', tokens.refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Log the login
        await this.auditService.log({
          userId: partnerUser.id,
          action: 'PARTNER_LOGIN',
          entity: 'User',
          entityId: partnerUser.id,
          meta: { method: 'discord-partner' },
        });

        return res.redirect(`${frontendUrl}/app/partner`);
      }
    }

    if (existingRequest?.status === PartnerAccessStatus.PENDING) {
      // Anfrage ist noch ausstehend - zeige Pending-Seite
      return res.redirect(`${frontendUrl}/partner-pending`);
    }

    // Kein Zugang oder abgelehnt - Speichere temporäre Partner-Daten in Cookie für Formular
    const partnerData = {
      discordId: partnerProfile.discordId,
      username: partnerProfile.username,
      avatarUrl: partnerProfile.avatarUrl,
      email: partnerProfile.email,
      wasRejected: existingRequest?.status === PartnerAccessStatus.REJECTED,
      rejectionNote: existingRequest?.reviewNote || null,
    };

    console.log('[PartnerCallback] Setting partner_request_data cookie and redirecting to /partner-request');
    console.log('[PartnerCallback] Partner data:', JSON.stringify(partnerData));

    res.cookie('partner_request_data', JSON.stringify(partnerData), {
      httpOnly: false, // Frontend muss es lesen können
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 Minuten
      path: '/', // Wichtig: Cookie für alle Pfade verfügbar
    });

    const redirectUrl = `${frontendUrl}/partner-request`;
    console.log('[PartnerCallback] Redirecting to:', redirectUrl);
    return res.redirect(redirectUrl);
  }

  // Handle taxi login callback
  private async handleTaxiCallback(req: Request, res: Response) {
    const taxiProfile = req.user as { 
      discordId: string; 
      username: string; 
      avatarUrl?: string; 
      email?: string;
      isTaxiLogin: boolean;
    };
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isProduction = process.env.NODE_ENV === 'production';

    console.log('[TaxiCallback] Processing taxi login:', taxiProfile.username, taxiProfile.discordId);

    // Prüfe ob bereits ein User mit dieser Discord-ID existiert
    const existingUser = await this.prisma.user.findUnique({
      where: { discordId: taxiProfile.discordId },
    });

    // Wenn der User bereits Taxi ist, direkt einloggen
    if (existingUser && (existingUser as any).isTaxi) {
      console.log('[TaxiCallback] Existing taxi user found, logging in');
      
      const tokens = await this.authService.generateTokens(existingUser);

      res.cookie('access_token', tokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      await this.auditService.log({
        userId: existingUser.id,
        action: 'TAXI_LOGIN',
        entity: 'User',
        entityId: existingUser.id,
        meta: { method: 'discord-taxi' },
      });

      return res.redirect(`${frontendUrl}/taxi`);
    }

    // User ist noch kein Taxi - speichere Discord-Daten in Cookie für Key-Eingabe
    // KEINE Tokens ausgeben! User muss erst Key validieren.
    const taxiRequestData = {
      discordId: taxiProfile.discordId,
      username: taxiProfile.username,
      avatarUrl: taxiProfile.avatarUrl,
      email: taxiProfile.email,
    };

    console.log('[TaxiCallback] User is not a taxi yet, redirecting to key page');
    console.log('[TaxiCallback] Setting cookie with data:', taxiRequestData);
    
    // Express encoded automatisch - NICHT zusätzlich encoden!
    res.cookie('taxi_request_data', JSON.stringify(taxiRequestData), {
      httpOnly: false, // Frontend muss es lesen können
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 Minuten
      path: '/',
    });

    return res.redirect(`${frontendUrl}/taxi-key`);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    try {
      const tokens = await this.authService.refreshTokens(refreshToken);

      // Set new cookies
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('access_token', tokens.accessToken, {
        httpOnly: true,
        secure: isProduction, // true for HTTPS in production
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction, // true for HTTPS in production
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.json({ message: 'Tokens refreshed successfully' });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response, @CurrentUser() user?: User) {
    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    // Log the logout if user is authenticated
    if (user) {
      await this.auditService.log({
        userId: user.id,
        action: 'USER_LOGOUT',
        entity: 'User',
        entityId: user.id,
        meta: {},
      });
    }

    return res.json({ message: 'Logged out successfully' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      username: user.username,
      icFirstName: user.icFirstName,
      icLastName: user.icLastName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      role: user.role,
      allRoles: user.allRoles,
      gender: user.gender,
      isPartner: (user as any).isPartner,
      isTaxi: (user as any).isTaxi,
      isTaxiLead: (user as any).isTaxiLead,
      partnerCanViewContacts: (user as any).partnerCanViewContacts,
      createdAt: user.createdAt,
    };
  }

}
