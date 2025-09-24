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

interface PrepayWeeksDto {
  userId: string;
  weeks: number;
  paidAmount?: number;
  paidMoney?: number;
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

  // Wochenabgabe bestätigen (Leaderschaft: EL_PATRON, DON, ASESOR)
  @Patch(':id/confirm')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
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

  // Statistiken (alle authentifizierten User)
  @Get('stats')
  async getStats() {
    return this.weeklyDeliveryService.getWeeklyDeliveryStats();
  }

  // Vorauszahlung für mehrere Wochen (Leaderschaft)
  @Post('prepay')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
  async prepayWeeks(@Body() prepayDto: PrepayWeeksDto, @Request() req) {
    return this.weeklyDeliveryService.prepayWeeks(
      prepayDto.userId,
      prepayDto.weeks,
      req.user.id,
      prepayDto.paidAmount,
      prepayDto.paidMoney
    );
  }

  // Alle User für Wochenabgabe indexieren (Leaderschaft)
  @Post('index-users')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
  async indexAllUsers() {
    return this.weeklyDeliveryService.indexAllUsers();
  }

  // Automatische Sanktionierung (Leaderschaft)
  @Post('auto-sanction')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
  async autoSanctionOverdue() {
    return this.weeklyDeliveryService.autoSanctionOverdue();
  }

  // Wöchentlicher Reset (Leaderschaft)
  @Post('weekly-reset')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
  async weeklyReset() {
    return this.weeklyDeliveryService.weeklyReset();
  }

  // Ausschluss erstellen (El Patron)
  @Post('exclusions')
  @Roles(Role.EL_PATRON)
  @UseGuards(RolesGuard)
  async createExclusion(@Body() exclusionDto: CreateExclusionDto, @Request() req) {
    const startDate = new Date(exclusionDto.startDate);
    const endDate = exclusionDto.endDate ? new Date(exclusionDto.endDate) : undefined;
    
    return this.weeklyDeliveryService.createExclusion(
      exclusionDto.userId,
      exclusionDto.reason,
      startDate,
      endDate,
      req.user.id
    );
  }

  // Ausschlüsse abrufen
  @Get('exclusions')
  async getExclusions(@Query('isActive') isActive?: string) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.weeklyDeliveryService.getExclusions(active);
  }

  // Ausschluss deaktivieren (Leaderschaft)
  @Patch('exclusions/:id/deactivate')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
  async deactivateExclusion(@Param('id') id: string) {
    return this.weeklyDeliveryService.deactivateExclusion(id);
  }

  // Development: Alle Wochenabgaben löschen
  @Post('clear-all')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
  async clearAllWeeklyDeliveries() {
    return this.weeklyDeliveryService.clearAllWeeklyDeliveries();
  }
}
