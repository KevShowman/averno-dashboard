import { Module } from '@nestjs/common';
import { MapAnnotationsController } from './map-annotations.controller';
import { MapAnnotationsService } from './map-annotations.service';

@Module({
  controllers: [MapAnnotationsController],
  providers: [MapAnnotationsService],
  exports: [MapAnnotationsService],
})
export class MapAnnotationsModule {}

