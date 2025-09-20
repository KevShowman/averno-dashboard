import { Module } from '@nestjs/common';
import { KokainController } from './kokain.controller';
import { KokainService } from './kokain.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [KokainController],
  providers: [KokainService],
  exports: [KokainService],
})
export class KokainModule {}
