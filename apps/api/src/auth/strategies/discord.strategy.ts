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
    });
  }

  async validate(req: any, accessToken: string, refreshToken: string, profile: any) {
    // Store rememberMe state from query parameter
    req.rememberMe = req.query.state === 'remember_me';
    return this.authService.validateDiscordUser(profile);
  }
}
