import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FamiliensammelnService } from './familiensammeln.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

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
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.SICARIO)
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
   * DELETE /familiensammeln/participation/:id
   * Entfernt eine Teilnahme
   */
  @Delete('participation/:id')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.SICARIO)
  async removeParticipation(@Param('id') id: string) {
    return this.familiensammelnService.removeParticipation(id);
  }
}

