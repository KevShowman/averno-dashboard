import { Module } from '@nestjs/common';
import { ClothingController } from './clothing.controller';
import { ClothingService } from './clothing.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClothingController],
  providers: [ClothingService],
  exports: [ClothingService],
})
export class ClothingModule {}

