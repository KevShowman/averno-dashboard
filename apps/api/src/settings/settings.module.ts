import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, AuditService],
  exports: [SettingsService],
})
export class SettingsModule {}

