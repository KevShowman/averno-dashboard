import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WeeklyDeliveryService } from './weekly-delivery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface CreateWeeklyDeliveryDto {
  weekStart: string;
  weekEnd: string;
}

interface PayWeeklyDeliveryDto {
  paidAmount?: number;
  paidMoney?: number;
}

interface CreateExclusionDto {
  userId: string;
  reason: string;
  startDate: string;
  endDate?: string;
}

@Controller('weekly-delivery')
@UseGuards(JwtAuthGuard)
export class WeeklyDeliveryController {
  constructor(private weeklyDeliveryService: WeeklyDeliveryService) {}

  // Wochenabgabe erstellen (Admin/Don)
  @Post()
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async createWeeklyDelivery(@Body() createDto: CreateWeeklyDeliveryDto, @Request() req) {
    const weekStart = new Date(createDto.weekStart);
    const weekEnd = new Date(createDto.weekEnd);
    
    return this.weeklyDeliveryService.createWeeklyDelivery(
      req.user.id,
      weekStart,
      weekEnd
    );
  }

  // Wochenabgabe bezahlen
  @Patch(':id/pay')
  async payWeeklyDelivery(
    @Param('id') id: string,
    @Body() payDto: PayWeeklyDeliveryDto,
    @Request() req
  ) {
    return this.weeklyDeliveryService.payWeeklyDelivery(
      id,
      payDto.paidAmount,
      payDto.paidMoney
    );
  }

  // Wochenabgabe bestätigen (Admin/Don/ROUTENVERWALTUNG)
  @Patch(':id/confirm')
  @Roles(Role.EL_PATRON, Role.DON, Role.ROUTENVERWALTUNG)
  @UseGuards(RolesGuard)
  async confirmWeeklyDelivery(@Param('id') id: string, @Request() req) {
    return this.weeklyDeliveryService.confirmWeeklyDelivery(id, req.user.id);
  }

  // Alle Wochenabgaben abrufen
  @Get()
  async getWeeklyDeliveries(
    @Query('status') status?: string,
    @Query('userId') userId?: string
  ) {
    return this.weeklyDeliveryService.getWeeklyDeliveries(status as any, userId);
  }

  // Aktuelle Woche abrufen
  @Get('current-week')
  async getCurrentWeekDeliveries() {
    return this.weeklyDeliveryService.getCurrentWeekDeliveries();
  }

  // Statistiken (Admin/Don)
  @Get('stats')
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async getStats() {
    return this.weeklyDeliveryService.getWeeklyDeliveryStats();
  }

  // Ausschluss erstellen (Admin/Don)
  @Post('exclusions')
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async createExclusion(@Body() exclusionDto: CreateExclusionDto, @Request() req) {
    const startDate = new Date(exclusionDto.startDate);
    const endDate = exclusionDto.endDate ? new Date(exclusionDto.endDate) : undefined;
    
    return this.weeklyDeliveryService.createExclusion(
      exclusionDto.userId,
      exclusionDto.reason,
      startDate,
      req.user.id,
      endDate
    );
  }

  // Ausschlüsse abrufen
  @Get('exclusions')
  async getExclusions(@Query('isActive') isActive?: string) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.weeklyDeliveryService.getExclusions(active);
  }

  // Ausschluss deaktivieren (Admin/Don)
  @Patch('exclusions/:id/deactivate')
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async deactivateExclusion(@Param('id') id: string) {
    return this.weeklyDeliveryService.deactivateExclusion(id);
  }
}
