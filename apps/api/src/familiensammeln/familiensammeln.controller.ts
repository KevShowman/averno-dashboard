import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FamiliensammelnService } from './familiensammeln.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';

@Controller('familiensammeln')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FamiliensammelnController {
  constructor(private readonly familiensammelnService: FamiliensammelnService) {}

  /**
   * GET /familiensammeln/current
   * Holt die aktuelle Woche mit allen Teilnahmen
   */
  @Get('current')
  async getCurrentWeek() {
    return this.familiensammelnService.getCurrentWeek();
  }

  /**
   * GET /familiensammeln/week/:id
   * Holt eine bestimmte Woche
   */
  @Get('week/:id')
  async getWeek(@Param('id') id: string) {
    return this.familiensammelnService.getWeek(id);
  }

  /**
   * GET /familiensammeln/weeks
   * Holt alle Wochen (Archiv)
   */
  @Get('weeks')
  async getAllWeeks(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.familiensammelnService.getAllWeeks(limitNum);
  }

  /**
   * GET /familiensammeln/week/:id/statistics
   * Holt Statistik für eine Woche
   */
  @Get('week/:id/statistics')
  async getWeekStatistics(@Param('id') id: string) {
    return this.familiensammelnService.getWeekStatistics(id);
  }

  /**
   * GET /familiensammeln/all-time-statistics
   * Holt Gesamtstatistik und Leaderboard über alle Wochen
   */
  @Get('all-time-statistics')
  async getAllTimeStatistics() {
    return this.familiensammelnService.getAllTimeStatistics();
  }

  /**
   * POST /familiensammeln/week
   * Erstellt eine neue Woche (oder holt bestehende)
   */
  @Post('week')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async createWeek(@Body() body: { weekStart: string }) {
    const weekStart = new Date(body.weekStart);
    return this.familiensammelnService.getOrCreateWeek(weekStart);
  }

  /**
   * POST /familiensammeln/participation
   * Fügt eine Teilnahme hinzu
   */
  @Post('participation')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async addParticipation(
    @Body()
    body: {
      weekId: string;
      userId: string;
      date: string;
    },
  ) {
    const date = new Date(body.date);
    return this.familiensammelnService.addParticipation(
      body.weekId,
      body.userId,
      date,
    );
  }

  /**
   * PATCH /familiensammeln/participation/:id/tourcount
   * Aktualisiert die Tour-Anzahl einer Teilnahme
   */
  @Patch('participation/:id/tourcount')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async updateParticipationTourCount(
    @Param('id') id: string,
    @Body() body: { tourCount: number },
  ) {
    return this.familiensammelnService.updateParticipationTourCount(id, body.tourCount);
  }

  /**
   * DELETE /familiensammeln/participation/:id
   * Entfernt eine Teilnahme
   */
  @Delete('participation/:id')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async removeParticipation(@Param('id') id: string) {
    return this.familiensammelnService.removeParticipation(id);
  }

  /**
   * GET /familiensammeln/week/:weekId/processors
   * Holt alle Verarbeiter für eine Woche
   */
  @Get('week/:weekId/processors')
  async getProcessors(@Param('weekId') weekId: string) {
    return this.familiensammelnService.getProcessors(weekId);
  }

  /**
   * POST /familiensammeln/week/:weekId/processors
   * Startet einen neuen Verarbeiter
   */
  @Post('week/:weekId/processors')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async startProcessor(
    @Param('weekId') weekId: string,
    @Body() body: { userId: string },
  ) {
    return this.familiensammelnService.startProcessor(weekId, body.userId);
  }

  /**
   * POST /familiensammeln/processors/:id/complete
   * Bestätigt die Entnahme eines Verarbeiters
   */
  @Post('processors/:id/complete')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async completeProcessor(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.familiensammelnService.completeProcessor(id, user.id);
  }
}

