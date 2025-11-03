import { Module, forwardRef } from '@nestjs/common';
import { AufstellungController } from './aufstellung.controller';
import { AufstellungService } from './aufstellung.service';
import { DiscordWebhookService } from './discord-webhook.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SanctionsModule } from '../sanctions/sanctions.module';
import { AbmeldungModule } from '../abmeldung/abmeldung.module';

@Module({
  imports: [PrismaModule, SanctionsModule, forwardRef(() => AbmeldungModule)],
  controllers: [AufstellungController],
  providers: [AufstellungService, DiscordWebhookService],
  exports: [AufstellungService],
})
export class AufstellungModule {}

