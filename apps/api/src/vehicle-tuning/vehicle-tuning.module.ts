import { Module } from '@nestjs/common';
import { VehicleTuningController } from './vehicle-tuning.controller';
import { VehicleTuningService } from './vehicle-tuning.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [VehicleTuningController],
  providers: [VehicleTuningService],
  exports: [VehicleTuningService],
})
export class VehicleTuningModule {}

