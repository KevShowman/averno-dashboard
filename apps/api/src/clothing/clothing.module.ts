import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ClothingController } from './clothing.controller';
import { ClothingService } from './clothing.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      dest: './uploads/outfits',
    }),
  ],
  controllers: [ClothingController],
  providers: [ClothingService],
  exports: [ClothingService],
})
export class ClothingModule {}

