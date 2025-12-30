import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('DISCORD_CLIENT_ID'),
      clientSecret: configService.get<string>('DISCORD_CLIENT_SECRET'),
      callbackURL: configService.get<string>('DISCORD_REDIRECT_URI'),
      scope: ['identify', 'email'],
      passReqToCallback: true, // Enables access to the request object
      // Note: state is passed manually via URL, not via passport state handling
    });
  }

  async validate(req: any, accessToken: string, refreshToken: string, profile: any) {
    // Get state from cookie (set before Discord redirect)
    const state = req.cookies?.auth_state || '';
    
    console.log('[DiscordStrategy] State from cookie:', state);
    console.log('[DiscordStrategy] Profile:', profile?.id, profile?.username);
    
    // Check if this is a partner login
    if (state === 'partner_login') {
      console.log('[DiscordStrategy] Partner login detected - skipping role validation');
      req.isPartnerLogin = true;
      
      // Return the profile directly for partner processing in controller
      // NO Discord role validation for partners!
      return {
        discordId: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar 
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` 
          : null,
        email: profile.email || null,
        isPartnerLogin: true,
      };
    }
    
    // Store rememberMe state from cookie
    req.rememberMe = state === 'remember_me';
    return this.authService.validateDiscordUser(profile);
  }
}
