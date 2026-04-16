import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService, AuditService],
  exports: [ItemsService],
})
export class ItemsModule {}
