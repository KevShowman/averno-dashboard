import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ItemsModule } from './items/items.module';
import { CashModule } from './cash/cash.module';
import { AuditModule } from './audit/audit.module';
import { ModulesModule } from './modules/modules.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { PackagesModule } from './packages/packages.module';
import { DiscordModule } from './discord/discord.module';
import { WeeklyDeliveryModule } from './weekly-delivery/weekly-delivery.module';
import { SanctionsModule } from './sanctions/sanctions.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StartupModule } from './startup/startup.module';
import { AufstellungModule } from './aufstellung/aufstellung.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    ItemsModule,
    CashModule,
    AuditModule,
    ModulesModule,
    UsersModule,
    SettingsModule,
    PackagesModule,
    DiscordModule,
    WeeklyDeliveryModule,
    SanctionsModule,
    SchedulerModule,
    StartupModule,
    AufstellungModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
