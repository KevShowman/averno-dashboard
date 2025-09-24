import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class StartupService implements OnModuleInit {
  private readonly logger = new Logger(StartupService.name);

  constructor(private discordService: DiscordService) {}

  async onModuleInit() {
    this.logger.log('🚀 Starting up LaSanta Calavera API...');
    
    try {
      // Index all Discord users on startup
      await this.indexAllUsers();
    } catch (error) {
      this.logger.error('❌ Error during startup user indexing:', error);
      // Don't throw - we don't want to crash the app if Discord is unreachable
    }
  }

  private async indexAllUsers() {
    try {
      this.logger.log('📋 Indexing all Discord users...');
      
      const result = await this.discordService.importDiscordMembers();
      
      this.logger.log(`✅ Discord user indexing completed:`);
      this.logger.log(`   - Total members: ${result.total}`);
      this.logger.log(`   - New users: ${result.imported}`);
      this.logger.log(`   - Updated users: ${result.updated}`);
      
      if (result.errors && result.errors.length > 0) {
        this.logger.warn(`⚠️  ${result.errors.length} errors during indexing:`);
        result.errors.forEach((error, index) => {
          this.logger.warn(`   ${index + 1}. ${error.username}: ${error.error}`);
        });
      }
    } catch (error) {
      this.logger.error('❌ Failed to index Discord users:', error);
      throw error;
    }
  }
}
