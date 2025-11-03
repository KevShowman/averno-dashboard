import { Module } from '@nestjs/common';
import { AbmeldungController } from './abmeldung.controller';
import { AbmeldungService } from './abmeldung.service';
import { AbmeldungWebhookService } from './discord-webhook.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AbmeldungController],
  providers: [AbmeldungService, AbmeldungWebhookService],
  exports: [AbmeldungService],
})
export class AbmeldungModule {}

