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
import { SanctionsService } from './sanctions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, SanctionCategory, SanctionStatus } from '@prisma/client';

interface CreateSanctionDto {
  userId: string;
  category: SanctionCategory;
  level: number;
  description: string;
}

interface CreateSanctionWithAutoLevelDto {
  userId: string;
  category: SanctionCategory;
  description: string;
}

@Controller('sanctions')
@UseGuards(JwtAuthGuard)
export class SanctionsController {
  constructor(private sanctionsService: SanctionsService) {}

  // Sanktion erstellen mit automatischem Level (Leaderschaft: EL_PATRON, DON, ASESOR)
  @Post()
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  @UseGuards(RolesGuard)
  async createSanctionWithAutoLevel(@Body() createDto: CreateSanctionWithAutoLevelDto, @Request() req) {
    return this.sanctionsService.createSanctionWithAutoLevel(
      createDto.userId,
      createDto.category,
      createDto.description,
      req.user.id
    );
  }

  // Sanktion erstellen mit manuellem Level (Leaderschaft: EL_PATRON, DON, ASESOR)
  @Post('manual')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  @UseGuards(RolesGuard)
  async createSanction(@Body() createDto: CreateSanctionDto, @Request() req) {
    return this.sanctionsService.createSanction(
      createDto.userId,
      createDto.category,
      createDto.level,
      createDto.description,
      req.user.id
    );
  }

  // Sanktion als bezahlt markieren (Leaderschaft)
  @Patch(':id/pay')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  @UseGuards(RolesGuard)
  async paySanction(@Param('id') id: string) {
    return this.sanctionsService.paySanction(id);
  }

  // Sanktion entfernen (Leaderschaft)
  @Patch(':id/remove')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  @UseGuards(RolesGuard)
  async removeSanction(@Param('id') id: string) {
    return this.sanctionsService.removeSanction(id);
  }

  // Alle Sanktionen abrufen (alle authentifizierten User)
  @Get()
  async getSanctions(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string
  ) {
    return this.sanctionsService.getSanctions(
      userId,
      status as SanctionStatus,
      category as SanctionCategory
    );
  }

  // Aktive Sanktionen eines Users abrufen
  @Get('user/:userId/active')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  @UseGuards(RolesGuard)
  async getUserActiveSanctions(@Param('userId') userId: string) {
    return this.sanctionsService.getUserActiveSanctions(userId);
  }

  // Eigene Sanktionen abrufen
  @Get('my')
  async getMySanctions(@Request() req) {
    return this.sanctionsService.getMySanctions(req.user.id);
  }

  // Abgelaufene Sanktionen bereinigen (Leaderschaft)
  @Post('cleanup')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  @UseGuards(RolesGuard)
  async cleanupExpiredSanctions() {
    return this.sanctionsService.cleanupExpiredSanctions();
  }

  // Statistiken (alle authentifizierten User)
  @Get('stats')
  async getStats() {
    return this.sanctionsService.getSanctionStats();
  }

  @Get('recent')
  async getRecentSanctions() {
    return this.sanctionsService.getRecentSanctions();
  }

  // Sanktionskategorien abrufen
  @Get('categories')
  async getCategories() {
    return {
      categories: [
        {
          key: SanctionCategory.ABMELDUNG,
          name: 'Abmeldung',
          description: 'Unentschuldigte Abwesenheit',
          penalties: [
            { level: 1, amount: 50000, penalty: null },
            { level: 2, amount: 150000, penalty: null },
            { level: 3, amount: 300000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.RESPEKTVERHALTEN,
          name: 'Respektverhalten',
          description: 'Beleidigungen, Ignorieren von Anweisungen',
          penalties: [
            { level: 1, amount: 75000, penalty: null },
            { level: 2, amount: 150000, penalty: null },
            { level: 3, amount: 300000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.FUNKCHECK,
          name: 'Funkcheck',
          description: 'Mehrfaches Ignorieren von Funkchecks',
          penalties: [
            { level: 1, amount: 100000, penalty: null },
            { level: 2, amount: 250000, penalty: null },
            { level: 3, amount: 500000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.REAKTIONSPFLICHT,
          name: 'Reaktionspflicht',
          description: 'Nicht reagieren / Nicht anwesend trotz Zusage',
          penalties: [
            { level: 1, amount: null, penalty: 'Joker' },
            { level: 2, amount: 250000, penalty: null },
            { level: 3, amount: 500000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.NICHT_BEZAHLT,
          name: 'Nicht bezahlt',
          description: 'Wochenabgabe nicht bezahlt',
          penalties: [
            { level: 1, amount: 100000, penalty: null },
            { level: 2, amount: 250000, penalty: null },
            { level: 3, amount: 500000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.NICHT_BEZAHLT_48H,
          name: 'Nicht bezahlt (48h)',
          description: 'Sanktion nicht innerhalb von 48 Stunden bezahlt',
          penalties: [
            { level: 1, amount: 200000, penalty: null },
            { level: 2, amount: 400000, penalty: null },
            { level: 3, amount: 500000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.RESPEKTLOS_ZIVILISTEN,
          name: 'Respektlos gegenüber Zivilisten',
          description: 'Unhöfliches oder respektloses Verhalten gegenüber Zivilisten',
          penalties: [
            { level: 1, amount: 50000, penalty: null },
            { level: 2, amount: 100000, penalty: null },
            { level: 3, amount: 250000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.RESPEKTLOS_FAMILIE,
          name: 'Respektlos gegenüber Familie',
          description: 'Respektloses Verhalten gegenüber Familienmitgliedern',
          penalties: [
            { level: 1, amount: 100000, penalty: null },
            { level: 2, amount: 250000, penalty: null },
            { level: 3, amount: 500000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.TOETUNG_FAMILIENMITGLIEDER,
          name: 'Tötung von Familienmitgliedern',
          description: 'Angriff oder Tötung von Mitgliedern der Familie',
          penalties: [
            { level: 1, amount: 500000, penalty: 'Blood Out' },
            { level: 2, amount: 500000, penalty: 'Blood Out' },
            { level: 3, amount: 500000, penalty: 'Blood Out' },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.SEXUELLE_BELAESTIGUNG,
          name: 'Sexuelle Belästigung',
          description: 'Sexuelle Belästigung oder unangemessenes Verhalten',
          penalties: [
            { level: 1, amount: 250000, penalty: null },
            { level: 2, amount: 500000, penalty: null },
            { level: 3, amount: 500000, penalty: 'Blood Out' },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.UNNOETIGES_BOXEN_SCHIESSEN,
          name: 'Unnötiges Boxen/Schießen',
          description: 'Gewaltanwendung ohne Grund',
          penalties: [
            { level: 1, amount: 50000, penalty: null },
            { level: 2, amount: 150000, penalty: null },
            { level: 3, amount: 300000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.MISSACHTUNG_ANWEISUNGEN,
          name: 'Missachtung von Anweisungen',
          description: 'Nichtbefolgen direkter Anweisungen',
          penalties: [
            { level: 1, amount: 75000, penalty: null },
            { level: 2, amount: 150000, penalty: null },
            { level: 3, amount: 300000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.FEHLEN_AUFSTELLUNG,
          name: 'Fehlen bei Aufstellung',
          description: 'Nicht erscheinen bei wichtigen Aufstellungen',
          penalties: [
            { level: 1, amount: null, penalty: 'Joker' },
            { level: 2, amount: 100000, penalty: null },
            { level: 3, amount: 250000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.NICHT_ANMELDEN_FUNKCHECK,
          name: 'Nicht beim Funkcheck angemeldet',
          description: 'Fehlende Anmeldung beim Funkcheck',
          penalties: [
            { level: 1, amount: 50000, penalty: null },
            { level: 2, amount: 100000, penalty: null },
            { level: 3, amount: 250000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.KLEIDERORDNUNG,
          name: 'Kleiderordnung nicht eingehalten',
          description: 'Tragen falscher oder unangemessener Kleidung',
          penalties: [
            { level: 1, amount: 25000, penalty: null },
            { level: 2, amount: 50000, penalty: null },
            { level: 3, amount: 100000, penalty: null },
            { level: 4, amount: 250000, penalty: null },
          ],
        },
        {
          key: SanctionCategory.MUNITIONSVERSCHWENDUNG,
          name: 'Munitionsverschwendung',
          description: 'Unnötige Verschwendung von Munition',
          penalties: [
            { level: 1, amount: 50000, penalty: null },
            { level: 2, amount: 100000, penalty: null },
            { level: 3, amount: 200000, penalty: null },
            { level: 4, amount: 400000, penalty: null },
          ],
        },
        {
          key: SanctionCategory.CASA_OHNE_ANKUENDIGUNG,
          name: 'Casa ohne Ankündigung betreten',
          description: 'Betreten der Casa ohne vorherige Ankündigung',
          penalties: [
            { level: 1, amount: 50000, penalty: null },
            { level: 2, amount: 100000, penalty: null },
            { level: 3, amount: 200000, penalty: null },
            { level: 4, amount: 400000, penalty: null },
          ],
        },
        {
          key: SanctionCategory.FUNKPFLICHT_MISSACHTUNG,
          name: 'Funkpflicht missachtet',
          description: 'Nichtnutzung des Funks trotz Pflicht',
          penalties: [
            { level: 1, amount: 50000, penalty: null },
            { level: 2, amount: 100000, penalty: null },
            { level: 3, amount: 250000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.FUNKDISZIPLIN_MISSACHTUNG,
          name: 'Funkdisziplin missachtet',
          description: 'Störung oder Missachtung der Funkdisziplin',
          penalties: [
            { level: 1, amount: 50000, penalty: null },
            { level: 2, amount: 100000, penalty: null },
            { level: 3, amount: 250000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
        {
          key: SanctionCategory.WOCHENABGABE_NICHT_ENTRICHTET,
          name: 'Wochenabgabe nicht entrichtet',
          description: 'Wochenabgabe trotz Verpflichtung nicht bezahlt (Familiensammeln)',
          penalties: [
            { level: 1, amount: 50000, penalty: null },
            { level: 2, amount: 150000, penalty: null },
            { level: 3, amount: 300000, penalty: null },
            { level: 4, amount: 500000, penalty: 'Blood Out' },
          ],
        },
      ],
    };
  }

  // El Patron: Sanktions-Level für User und Kategorie zurücksetzen
  @Post('reset-user-levels')
  @Roles(Role.EL_PATRON)
  @UseGuards(RolesGuard)
  async resetUserSanctionLevels(
    @Body() data: { userId: string; category: SanctionCategory },
    @Request() req,
  ) {
    return this.sanctionsService.resetUserSanctionLevels(
      data.userId,
      data.category,
      req.user.id,
    );
  }

  // Automatische 48h-Sanktionierung
  @Post('auto-sanction-48h')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  @UseGuards(RolesGuard)
  async autoSanctionUnpaidAfter48h() {
    return this.sanctionsService.autoSanctionUnpaidAfter48h();
  }
}
