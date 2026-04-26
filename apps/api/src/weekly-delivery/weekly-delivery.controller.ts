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
import { Role, User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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

  // Wochenabgabe erstellen (Leaderschaft)
  @Post()
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
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

  // Bestätigen-Workflow entfernt - PAID ist nun der finale Status

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

  @Get('recent')
  async getRecentDeliveries() {
    return this.weeklyDeliveryService.getRecentDeliveries();
  }

  // Vorauszahlung für mehrere Wochen (Leaderschaft)
  @Post('prepay')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
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
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async indexAllUsers() {
    return this.weeklyDeliveryService.indexAllUsers();
  }

  // Automatische Sanktionierung (Leaderschaft)
  @Post('auto-sanction')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async autoSanctionOverdue() {
    return this.weeklyDeliveryService.autoSanctionOverdue();
  }

  // Wöchentlicher Reset (Leaderschaft)
  @Post('weekly-reset')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async weeklyReset() {
    return this.weeklyDeliveryService.weeklyReset();
  }

  // Ausschluss erstellen (Patron)
  @Post('exclusions')
  @Roles(Role.PATRON, Role.ADMIN)
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
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async deactivateExclusion(@Param('id') id: string) {
    return this.weeklyDeliveryService.deactivateExclusion(id);
  }

  // Archivierung der aktuellen Woche (Leaderschaft)
  @Post('archive-current-week')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async archiveCurrentWeek(@CurrentUser() user: User) {
    return this.weeklyDeliveryService.archiveCurrentWeek(user.id);
  }

  // Archivierte Wochen abrufen
  @Get('archives')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.SICARIO, Role.LINCE)
  async getArchives() {
    return this.weeklyDeliveryService.getArchives();
  }

  // Archiv-Details abrufen
  @Get('archives/:id')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.SICARIO, Role.LINCE)
  async getArchiveDetails(@Param('id') archiveId: string) {
    return this.weeklyDeliveryService.getArchiveDetails(archiveId);
  }

  // Development: Alle Wochenabgaben löschen
  @Post('clear-all')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async clearAllWeeklyDeliveries() {
    return this.weeklyDeliveryService.clearAllWeeklyDeliveries();
  }
}
