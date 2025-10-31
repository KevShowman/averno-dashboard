import { Module } from '@nestjs/common';
import { AufstellungController } from './aufstellung.controller';
import { AufstellungService } from './aufstellung.service';
import { DiscordWebhookService } from './discord-webhook.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SanctionsModule } from '../sanctions/sanctions.module';

@Module({
  imports: [PrismaModule, SanctionsModule],
  controllers: [AufstellungController],
  providers: [AufstellungService, DiscordWebhookService],
  exports: [AufstellungService],
})
export class AufstellungModule {}

