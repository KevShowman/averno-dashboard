import { Module } from '@nestjs/common';
import { BloodListController } from './bloodlist.controller';
import { BloodListService } from './bloodlist.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [BloodListController],
  providers: [BloodListService],
  exports: [BloodListService],
})
export class BloodListModule {}

