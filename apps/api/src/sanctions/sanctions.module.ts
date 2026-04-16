import { Module } from '@nestjs/common';
import { SanctionsController } from './sanctions.controller';
import { SanctionsService } from './sanctions.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, AuditModule, DiscordModule, SettingsModule],
  controllers: [SanctionsController],
  providers: [SanctionsService],
  exports: [SanctionsService],
})
export class SanctionsModule {}
