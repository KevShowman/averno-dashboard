import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiscordController],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
