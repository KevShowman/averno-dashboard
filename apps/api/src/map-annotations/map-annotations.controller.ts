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

  // ============ STATIC ROUTES FIRST (before :id) ============

  @Get()
  findAll(@Query('map') mapName?: MapName) {
    return this.mapAnnotationsService.findAll(mapName);
  }

  @Get('family-contacts')
  getAvailableFamilyContacts() {
    return this.mapAnnotationsService.getAvailableFamilyContacts();
  }

  @Get('family-stats')
  getFamilyLinkStats() {
    return this.mapAnnotationsService.getFamilyLinkStats();
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

  // ============ PERMISSION MANAGEMENT ============

  @Get('permissions/map')
  getMapPermissions() {
    return this.mapAnnotationsService.getMapPermissions();
  }

  @Post('permissions/map')
  addMapPermission(
    @CurrentUser() user: any,
    @Body() data: { userId: string },
  ) {
    return this.mapAnnotationsService.addMapPermission(user, data.userId);
  }

  @Delete('permissions/map/:userId')
  removeMapPermission(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
  ) {
    return this.mapAnnotationsService.removeMapPermission(user, userId);
  }

  // ============ SUGGESTIONS ============

  @Get('suggestions')
  getAllSuggestions(
    @CurrentUser() user: any,
    @Query('map') mapName?: MapName,
  ) {
    return this.mapAnnotationsService.getAllSuggestions(user, mapName);
  }

  @Get('suggestions/my')
  getMySuggestions(@CurrentUser() user: any) {
    return this.mapAnnotationsService.getMySuggestions(user.id);
  }

  @Get('suggestions/pending-count')
  getPendingSuggestionsCount() {
    return this.mapAnnotationsService.getPendingSuggestionsCount();
  }

  @Post('suggestions')
  createSuggestion(
    @CurrentUser() user: any,
    @Body()
    data: {
      mapName: MapName;
      x: number;
      y: number;
      icon?: string;
      label?: string;
      familyContactId?: string;
      isKeyFamily?: boolean;
      isOutdated?: boolean;
    },
  ) {
    return this.mapAnnotationsService.createSuggestion(user, data);
  }

  @Post('suggestions/:id/approve')
  approveSuggestion(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.mapAnnotationsService.approveSuggestion(user, id);
  }

  @Post('suggestions/:id/reject')
  rejectSuggestion(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { reviewNote?: string },
  ) {
    return this.mapAnnotationsService.rejectSuggestion(user, id, data.reviewNote);
  }

  @Delete('suggestions/:id')
  deleteSuggestion(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.mapAnnotationsService.deleteSuggestion(user, id);
  }

  // ============ GENERIC :id ROUTES LAST ============

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
}
