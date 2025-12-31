import { Module, forwardRef } from '@nestjs/common';
import { TaxiService } from './taxi.service';
import { TaxiController } from './taxi.controller';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthModule } from '../auth/auth.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [forwardRef(() => AuthModule), DiscordModule],
  providers: [TaxiService, PrismaService, AuditService],
  controllers: [TaxiController],
  exports: [TaxiService],
})
export class TaxiModule {}

