import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { WeeklyDeliveryModule } from '../weekly-delivery/weekly-delivery.module';
import { SanctionsModule } from '../sanctions/sanctions.module';
import { DiscordModule } from '../discord/discord.module';
import { AufstellungModule } from '../aufstellung/aufstellung.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    WeeklyDeliveryModule,
    SanctionsModule,
    DiscordModule,
    AufstellungModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
