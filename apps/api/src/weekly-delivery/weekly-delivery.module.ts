import { Module } from '@nestjs/common';
import { WeeklyDeliveryController } from './weekly-delivery.controller';
import { WeeklyDeliveryService } from './weekly-delivery.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [PrismaModule, DiscordModule],
  controllers: [WeeklyDeliveryController],
  providers: [WeeklyDeliveryService],
  exports: [WeeklyDeliveryService],
})
export class WeeklyDeliveryModule {}
