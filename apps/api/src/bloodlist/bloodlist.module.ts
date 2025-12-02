import { Module } from '@nestjs/common';
import { BloodListController } from './bloodlist.controller';
import { BloodListService } from './bloodlist.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, AuditModule, DiscordModule, SettingsModule],
  controllers: [BloodListController],
  providers: [BloodListService],
  exports: [BloodListService],
})
export class BloodListModule {}

