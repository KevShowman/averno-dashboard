import { Module } from '@nestjs/common';
import { WeeklyDeliveryController } from './weekly-delivery.controller';
import { WeeklyDeliveryService } from './weekly-delivery.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WeeklyDeliveryController],
  providers: [WeeklyDeliveryService],
  exports: [WeeklyDeliveryService],
})
export class WeeklyDeliveryModule {}
