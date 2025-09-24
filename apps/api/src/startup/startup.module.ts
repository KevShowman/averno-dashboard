import { Module } from '@nestjs/common';
import { StartupService } from './startup.service';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [DiscordModule],
  providers: [StartupService],
})
export class StartupModule {}
