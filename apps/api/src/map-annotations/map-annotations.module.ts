import { Module } from '@nestjs/common';
import { MapAnnotationsController } from './map-annotations.controller';
import { MapAnnotationsService } from './map-annotations.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [MapAnnotationsController],
  providers: [MapAnnotationsService],
  exports: [MapAnnotationsService],
})
export class MapAnnotationsModule {}

