import { Module } from '@nestjs/common';
import { VehicleTuningController } from './vehicle-tuning.controller';
import { VehicleTuningService } from './vehicle-tuning.service';

@Module({
  controllers: [VehicleTuningController],
  providers: [VehicleTuningService],
  exports: [VehicleTuningService],
})
export class VehicleTuningModule {}

