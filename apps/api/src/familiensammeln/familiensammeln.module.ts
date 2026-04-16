import { Module } from '@nestjs/common';
import { FamiliensammelnService } from './familiensammeln.service';
import { FamiliensammelnController } from './familiensammeln.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FamiliensammelnController],
  providers: [FamiliensammelnService],
  exports: [FamiliensammelnService],
})
export class FamiliensammelnModule {}

