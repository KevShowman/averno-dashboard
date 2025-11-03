import { Module } from '@nestjs/common';
import { AbmeldungController } from './abmeldung.controller';
import { AbmeldungService } from './abmeldung.service';
import { AbmeldungWebhookService } from './discord-webhook.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AbmeldungController],
  providers: [AbmeldungService, AbmeldungWebhookService],
  exports: [AbmeldungService],
})
export class AbmeldungModule {}

