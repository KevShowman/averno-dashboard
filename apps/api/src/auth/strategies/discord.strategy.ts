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
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    return this.authService.validateDiscordUser(profile);
  }
}
