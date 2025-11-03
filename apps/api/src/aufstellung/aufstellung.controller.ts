import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User, AufstellungResponseStatus } from '@prisma/client';
import { AufstellungService } from './aufstellung.service';
import { DiscordWebhookService } from './discord-webhook.service';

interface CreateAufstellungDto {
  date: string; // ISO string
  time: string; // HH:MM format
  reason: string;
}

interface RespondAufstellungDto {
  status: AufstellungResponseStatus;
}

interface CreateExclusionDto {
  userId: string;
  reason: string;
  startDate: string; // ISO string
  endDate?: string; // ISO string, optional
}

@Controller('aufstellung')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AufstellungController {
  constructor(
    private aufstellungService: AufstellungService,
    private discordWebhookService: DiscordWebhookService,
  ) {}

  // Erstelle neue Aufstellung (nur El Patron, Don, Asesor)
  @Post()
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async createAufstellung(
    @Body() createDto: CreateAufstellungDto,
    @CurrentUser() user: User,
  ) {
    // Kombiniere Datum und Uhrzeit (ohne Z für lokale Zeit)
    const dateTime = new Date(`${createDto.date}T${createDto.time}:00.000`);
    
    const aufstellung = await this.aufstellungService.createAufstellung(
      user.id,
      dateTime,
      createDto.reason,
    );

    // Sende Discord-Benachrichtigung
    try {
      await this.discordWebhookService.sendAufstellungNotification(aufstellung);
    } catch (error) {
      console.error('Fehler beim Senden der Discord-Benachrichtigung:', error);
      // Fehler nicht werfen, Aufstellung wurde trotzdem erstellt
    }

    return aufstellung;
  }

  // Alle Aufstellungen abrufen
  @Get()
  async getAllAufstellungen() {
    return this.aufstellungService.getAllAufstellungen();
  }

  // Kommende Aufstellungen
  @Get('upcoming')
  async getUpcomingAufstellungen() {
    return this.aufstellungService.getUpcomingAufstellungen();
  }

  // Meine ausstehenden Aufstellungen
  @Get('my-pending')
  async getMyPendingAufstellungen(@CurrentUser() user: User) {
    return this.aufstellungService.getMyPendingAufstellungen(user.id);
  }

  // Einzelne Aufstellung mit Details
  @Get(':id')
  async getAufstellungById(@Param('id') id: string) {
    return this.aufstellungService.getAufstellungById(id);
  }

  // Auf Aufstellung reagieren
  @Post(':id/respond')
  async respondToAufstellung(
    @Param('id') id: string,
    @Body() respondDto: RespondAufstellungDto,
    @CurrentUser() user: User,
  ) {
    return this.aufstellungService.respondToAufstellung(
      id,
      user.id,
      respondDto.status,
    );
  }

  // Nicht-Reagierer sanktionieren (nur El Patron, Don, Asesor)
  @Post(':id/sanction-non-responders')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async sanctionNonResponders(@Param('id') id: string) {
    return this.aufstellungService.sanctionNonResponders(id);
  }

  // Aufstellung löschen (nur El Patron, Don)
  @Delete(':id')
  @Roles(Role.EL_PATRON, Role.DON)
  async deleteAufstellung(@Param('id') id: string) {
    return this.aufstellungService.deleteAufstellung(id);
  }

  // ===== EXCLUSIONS =====

  // Exclusion erstellen (nur El Patron, Don, Asesor)
  @Post('exclusions')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async createExclusion(
    @Body() createDto: CreateExclusionDto,
    @CurrentUser() user: User,
  ) {
    return this.aufstellungService.createExclusion(
      createDto.userId,
      createDto.reason,
      new Date(createDto.startDate),
      createDto.endDate ? new Date(createDto.endDate) : null,
      user.id,
    );
  }

  // Alle Exclusions abrufen (nur Leaderschaft)
  @Get('exclusions')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async getAllExclusions() {
    return this.aufstellungService.getAllExclusions();
  }

  // Aktive Exclusions abrufen (nur Leaderschaft)
  @Get('exclusions/active')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  async getActiveExclusions() {
    return this.aufstellungService.getActiveExclusions();
  }

  // Exclusion deaktivieren (nur El Patron, Don)
  @Patch('exclusions/:id/deactivate')
  @Roles(Role.EL_PATRON, Role.DON)
  async deactivateExclusion(@Param('id') id: string) {
    return this.aufstellungService.deactivateExclusion(id);
  }

  // Exclusion löschen (nur El Patron)
  @Delete('exclusions/:id')
  @Roles(Role.EL_PATRON)
  async deleteExclusion(@Param('id') id: string) {
    return this.aufstellungService.deleteExclusion(id);
  }
}

