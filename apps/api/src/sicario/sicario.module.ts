import { Module } from '@nestjs/common';
import { SicarioController } from './sicario.controller';
import { SicarioService } from './sicario.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { AbmeldungModule } from '../abmeldung/abmeldung.module';

@Module({
  imports: [PrismaModule, DiscordModule, AbmeldungModule],
  controllers: [SicarioController],
  providers: [SicarioService],
  exports: [SicarioService],
})
export class SicarioModule {}

