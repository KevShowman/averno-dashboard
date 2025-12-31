import { Module } from '@nestjs/common';
import { TafelrundeService } from './tafelrunde.service';
import { TafelrundeController } from './tafelrunde.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [PrismaModule, AuditModule, DiscordModule],
  controllers: [TafelrundeController],
  providers: [TafelrundeService],
  exports: [TafelrundeService],
})
export class TafelrundeModule {}


