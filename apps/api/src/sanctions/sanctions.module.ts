import { Module } from '@nestjs/common';
import { SanctionsController } from './sanctions.controller';
import { SanctionsService } from './sanctions.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SanctionsController],
  providers: [SanctionsService],
  exports: [SanctionsService],
})
export class SanctionsModule {}
