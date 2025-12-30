import { Module } from '@nestjs/common';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [AuditModule, DiscordModule],
  controllers: [PartnerController],
  providers: [PartnerService],
  exports: [PartnerService],
})
export class PartnerModule {}

