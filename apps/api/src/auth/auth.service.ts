import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { User, Role } from '@prisma/client';
import { DiscordService } from '../discord/discord.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private discordService: DiscordService,
  ) {}

  async validateDiscordUser(profile: any): Promise<User> {
    const { id: discordId, username, avatar, email } = profile;
    
    // Discord-Rollen des Benutzers abrufen
    const userDiscordRoles = await this.discordService.getUserRoles(discordId);
    
    // Zugriff validieren
    const validation = await this.discordService.validateUserAccess(discordId);
    
    if (!validation.hasAccess) {
      throw new BadRequestException(validation.reason || 'Zugriff verweigert - Du hast keine der erlaubten Discord-Rollen');
    }

    let user = await this.prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      // Create new user with Discord-synced role
      user = await this.prisma.user.create({
        data: {
          discordId,
          username,
          avatarUrl: avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png` : null,
          email,
          role: validation.highestRole!,
          discordRoles: userDiscordRoles,
        },
      });
    } else {
      // Update user info and sync role
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          avatarUrl: avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png` : user.avatarUrl,
          email: email || user.email,
          role: validation.highestRole!,
          discordRoles: userDiscordRoles,
        },
      });
    }

    return user;
  }

  async generateTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken };
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.validateJwtPayload(payload);
      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async updateUserRole(userId: string, role: Role): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }
}
