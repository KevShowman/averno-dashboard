import { Controller, Get, Post, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User, AufstellungResponseStatus } from '@prisma/client';
import { SicarioService } from './sicario.service';

interface CreateSicarioAufstellungDto {
  date: string; // ISO string
  time: string; // HH:MM format
  reason: string;
  location?: string;
}

interface RespondAufstellungDto {
  status: AufstellungResponseStatus;
}

@Controller('sicario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SicarioController {
  constructor(private sicarioService: SicarioService) {}

  // Prüft ob User Zugang zum Sicario-Bereich hat
  private async checkAccess(userId: string) {
    const isSicario = await this.sicarioService.isSicario(userId);
    const isLeadership = await this.sicarioService.isLeadership(userId);
    
    if (!isSicario && !isLeadership) {
      throw new ForbiddenException('Zugang nur für Sicarios und Leaderschaft');
    }
    
    return { isSicario, isLeadership };
  }

  // Sicario-Team Übersicht
  @Get('team')
  async getSicarioTeam(@CurrentUser() user: User) {
    await this.checkAccess(user.id);
    return this.sicarioService.getSicarioTeam();
  }

  // Erstelle neue Sicario-Aufstellung (nur Leaderschaft)
  @Post('aufstellung')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.SICARIO)
  async createAufstellung(
    @Body() createDto: CreateSicarioAufstellungDto,
    @CurrentUser() user: User,
  ) {
    await this.checkAccess(user.id);

    // Kombiniere Datum und Uhrzeit
    const dateTimeStr = `${createDto.date}T${createDto.time}:00`;
    const localDate = new Date(dateTimeStr);
    
    // Berlin Timezone Anpassung
    const berlinOffset = -60;
    const serverOffset = localDate.getTimezoneOffset();
    const adjustmentMinutes = berlinOffset - serverOffset;
    const berlinDate = new Date(localDate.getTime() + (adjustmentMinutes * 60 * 1000));

    return this.sicarioService.createAufstellung(
      user.id,
      berlinDate,
      createDto.reason,
      createDto.location,
    );
  }

  // Alle Sicario-Aufstellungen
  @Get('aufstellungen')
  async getAllAufstellungen(@CurrentUser() user: User) {
    await this.checkAccess(user.id);
    return this.sicarioService.getAllAufstellungen();
  }

  // Kommende Sicario-Aufstellungen
  @Get('aufstellungen/upcoming')
  async getUpcomingAufstellungen(@CurrentUser() user: User) {
    await this.checkAccess(user.id);
    return this.sicarioService.getUpcomingAufstellungen();
  }

  // Meine ausstehenden Aufstellungen
  @Get('aufstellungen/my-pending')
  async getMyPendingAufstellungen(@CurrentUser() user: User) {
    await this.checkAccess(user.id);
    return this.sicarioService.getMyPendingAufstellungen(user.id);
  }

  // Einzelne Aufstellung mit Details
  @Get('aufstellung/:id')
  async getAufstellungById(@Param('id') id: string, @CurrentUser() user: User) {
    await this.checkAccess(user.id);
    return this.sicarioService.getAufstellungById(id);
  }

  // Auf Aufstellung reagieren
  @Post('aufstellung/:id/respond')
  async respondToAufstellung(
    @Param('id') id: string,
    @Body() respondDto: RespondAufstellungDto,
    @CurrentUser() user: User,
  ) {
    await this.checkAccess(user.id);
    return this.sicarioService.respondToAufstellung(id, user.id, respondDto.status);
  }

  // Aufstellung löschen (nur Leaderschaft)
  @Delete('aufstellung/:id')
  @Roles(Role.PATRON, Role.DON, Role.CAPO)
  async deleteAufstellung(@Param('id') id: string, @CurrentUser() user: User) {
    await this.checkAccess(user.id);
    return this.sicarioService.deleteAufstellung(id);
  }

  // Zugangs-Check Endpoint (für Frontend)
  @Get('access')
  async checkAccessEndpoint(@CurrentUser() user: User) {
    try {
      const { isSicario, isLeadership } = await this.checkAccess(user.id);
      return {
        hasAccess: true,
        isSicario,
        isLeadership,
      };
    } catch {
      return {
        hasAccess: false,
        isSicario: false,
        isLeadership: false,
      };
    }
  }
}

