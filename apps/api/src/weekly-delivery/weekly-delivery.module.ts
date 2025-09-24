import { Module } from '@nestjs/common';
import { WeeklyDeliveryController } from './weekly-delivery.controller';
import { WeeklyDeliveryService } from './weekly-delivery.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { SettingsModule } from '../settings/settings.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, DiscordModule, SettingsModule, AuditModule],
  controllers: [WeeklyDeliveryController],
  providers: [WeeklyDeliveryService],
  exports: [WeeklyDeliveryService],
})
export class WeeklyDeliveryModule {}
