import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { AbmeldungService } from './abmeldung.service';

interface CreateAbmeldungDto {
  startDate: string; // ISO string
  endDate: string; // ISO string
  reason?: string;
}

interface UpdateAbmeldungDto {
  startDate?: string;
  endDate?: string;
  reason?: string;
}

@Controller('abmeldung')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbmeldungController {
  constructor(private abmeldungService: AbmeldungService) {}

  // Erstelle neue Abmeldung
  @Post()
  async createAbmeldung(
    @Body() createDto: CreateAbmeldungDto,
    @CurrentUser() user: User,
  ) {
    // Parse Dates als UTC Midnight um Timezone-Probleme zu vermeiden
    // Frontend sendet: "2025-11-06" → speichere als "2025-11-06T00:00:00.000Z"
    const startDate = new Date(createDto.startDate + 'T00:00:00.000Z');
    const endDate = new Date(createDto.endDate + 'T23:59:59.999Z');
    
    return this.abmeldungService.createAbmeldung(
      user.id,
      startDate,
      endDate,
      createDto.reason,
    );
  }

  // Alle Abmeldungen abrufen (nur Leaderschaft)
  @Get()
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  async getAllAbmeldungen() {
    return this.abmeldungService.getAllAbmeldungen();
  }

  // Aktuelle Abmeldungen (heute oder in der Zukunft)
  @Get('current')
  async getCurrentAbmeldungen() {
    return this.abmeldungService.getCurrentAbmeldungen();
  }

  // Meine Abmeldungen
  @Get('my')
  async getMyAbmeldungen(@CurrentUser() user: User) {
    return this.abmeldungService.getMyAbmeldungen(user.id);
  }

  // Abmeldung aktualisieren
  @Patch(':id')
  async updateAbmeldung(
    @Param('id') id: string,
    @Body() updateDto: UpdateAbmeldungDto,
    @CurrentUser() user: User,
  ) {
    // Parse Dates als UTC (konsistent mit create)
    const startDate = updateDto.startDate 
      ? new Date(updateDto.startDate + 'T00:00:00.000Z') 
      : undefined;
    const endDate = updateDto.endDate 
      ? new Date(updateDto.endDate + 'T23:59:59.999Z') 
      : undefined;
    
    return this.abmeldungService.updateAbmeldung(
      id,
      user.id,
      user.role,
      startDate,
      endDate,
      updateDto.reason,
    );
  }

  // Abmeldung löschen
  @Delete(':id')
  async deleteAbmeldung(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.abmeldungService.deleteAbmeldung(id, user.id, user.role);
  }

  // Cleanup alte Abmeldungen (nur Patron)
  @Post('cleanup')
  @Roles(Role.PATRON, Role.ADMIN)
  async cleanupOldAbmeldungen() {
    return this.abmeldungService.cleanupOldAbmeldungen();
  }
}

