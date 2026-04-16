import { Module } from '@nestjs/common';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [CashController],
  providers: [CashService, AuditService],
  exports: [CashService],
})
export class CashModule {}
