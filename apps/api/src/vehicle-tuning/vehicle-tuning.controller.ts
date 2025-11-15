import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VehicleTuningService } from './vehicle-tuning.service';

@Controller('vehicle-tuning')
@UseGuards(JwtAuthGuard)
export class VehicleTuningController {
  constructor(private vehicleTuningService: VehicleTuningService) {}

  // Tuning-Vorgaben abrufen (alle User)
  @Get()
  async getTuningSpecs() {
    return this.vehicleTuningService.getTuningSpecs();
  }
}

