import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordStrategy } from './strategies/discord.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RolesGuard } from './guards/roles.guard';
import { AuditService } from '../audit/audit.service';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [
    PassportModule,
    DiscordModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    DiscordStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    RolesGuard,
    AuditService,
  ],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
