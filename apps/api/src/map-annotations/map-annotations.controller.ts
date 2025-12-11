import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MapAnnotationsService } from './map-annotations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MapName } from '@prisma/client';

@Controller('map-annotations')
@UseGuards(JwtAuthGuard)
export class MapAnnotationsController {
  constructor(private readonly mapAnnotationsService: MapAnnotationsService) {}

  @Get()
  findAll(@Query('map') mapName?: MapName) {
    return this.mapAnnotationsService.findAll(mapName);
  }

  @Get('family-contacts')
  getAvailableFamilyContacts() {
    return this.mapAnnotationsService.getAvailableFamilyContacts();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mapAnnotationsService.findOne(id);
  }

  @Post()
  create(
    @CurrentUser() user: any,
    @Body()
    data: {
      mapName: MapName;
      x: number;
      y: number;
      icon?: string;
      label?: string;
      familyContactId?: string;
    },
  ) {
    return this.mapAnnotationsService.create(user, data);
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body()
    data: {
      x?: number;
      y?: number;
      icon?: string;
      label?: string;
      familyContactId?: string | null;
    },
  ) {
    return this.mapAnnotationsService.update(user, id, data);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mapAnnotationsService.delete(user, id);
  }

  // ============ MAP AREAS (Gebiete) ============

  @Get('areas/list')
  findAllAreas(@Query('map') mapName?: MapName) {
    return this.mapAnnotationsService.findAllAreas(mapName);
  }

  @Post('areas')
  createArea(
    @CurrentUser() user: any,
    @Body()
    data: {
      mapName: MapName;
      points: { x: number; y: number }[];
      label: string;
      color?: string;
    },
  ) {
    return this.mapAnnotationsService.createArea(user, data);
  }

  @Put('areas/:id')
  updateArea(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body()
    data: {
      points?: { x: number; y: number }[];
      label?: string;
      color?: string;
    },
  ) {
    return this.mapAnnotationsService.updateArea(user, id, data);
  }

  @Delete('areas/:id')
  deleteArea(@CurrentUser() user: any, @Param('id') id: string) {
    return this.mapAnnotationsService.deleteArea(user, id);
  }
}

