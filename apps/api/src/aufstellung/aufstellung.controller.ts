import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User, AufstellungResponseStatus } from '@prisma/client';
import { AufstellungService } from './aufstellung.service';
import { DiscordWebhookService } from './discord-webhook.service';
import { fromZonedTime } from 'date-fns-tz';

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

  // Erstelle neue Aufstellung (nur Patron, Don, Capo, Consultora, Padrino, Admin)
  @Post()
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.CONSULTORA, Role.PADRINO, Role.ADMIN)
  async createAufstellung(
    @Body() createDto: CreateAufstellungDto,
    @CurrentUser() user: User,
  ) {
    // Kombiniere Datum und Uhrzeit als Berliner Zeit und konvertiere nach UTC
    const berlinDate = fromZonedTime(
      `${createDto.date}T${createDto.time}:00`,
      'Europe/Berlin',
    );
    
    const aufstellung = await this.aufstellungService.createAufstellung(
      user.id,
      berlinDate,
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

  // ===== EXCLUSIONS (vor :id Route!) =====

  // Aktive Exclusions abrufen (nur Leaderschaft)
  @Get('exclusions/active')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  async getActiveExclusions() {
    return this.aufstellungService.getActiveExclusions();
  }

  // Alle Exclusions abrufen (nur Leaderschaft)
  @Get('exclusions')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  async getAllExclusions() {
    return this.aufstellungService.getAllExclusions();
  }

  // Exclusion erstellen (nur Patron, Don, Capo)
  @Post('exclusions')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
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

  // Exclusion deaktivieren (Leaderschaft)
  @Patch('exclusions/:id/deactivate')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  async deactivateExclusion(@Param('id') id: string) {
    return this.aufstellungService.deactivateExclusion(id);
  }

  // Exclusion löschen (nur Patron)
  @Delete('exclusions/:id')
  @Roles(Role.PATRON, Role.ADMIN)
  async deleteExclusion(@Param('id') id: string) {
    return this.aufstellungService.deleteExclusion(id);
  }

  // ===== AUFSTELLUNG BY ID (muss nach allen spezifischen Routes kommen!) =====

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

  // Nicht-Reagierer sanktionieren (nur Patron, Don, Capo)
  @Post(':id/sanction-non-responders')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  async sanctionNonResponders(@Param('id') id: string) {
    return this.aufstellungService.sanctionNonResponders(id);
  }

  // Reminder an nicht-reagierende User senden (Leaderschaft)
  @Post(':id/send-reminder')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  async sendReminder(@Param('id') id: string) {
    return this.aufstellungService.sendReminder(id);
  }

  // Aufstellung löschen (Leaderschaft + Rang 8 und 9)
  @Delete(':id')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.CONSULTORA, Role.PADRINO, Role.ADMIN)
  async deleteAufstellung(@Param('id') id: string) {
    return this.aufstellungService.deleteAufstellung(id);
  }
}

