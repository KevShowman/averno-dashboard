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
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
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
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
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
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
  async paySanction(@Param('id') id: string) {
    return this.sanctionsService.paySanction(id);
  }

  // Sanktion entfernen (Leaderschaft)
  @Patch(':id/remove')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
  async removeSanction(@Param('id') id: string) {
    return this.sanctionsService.removeSanction(id);
  }

  // Alle Sanktionen abrufen
  @Get()
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
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
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR)
  @UseGuards(RolesGuard)
  async getUserActiveSanctions(@Param('userId') userId: string) {
    return this.sanctionsService.getUserActiveSanctions(userId);
  }

  // Eigene Sanktionen abrufen
  @Get('my')
  async getMySanctions(@Request() req) {
    return this.sanctionsService.getMySanctions(req.user.id);
  }

  // Abgelaufene Sanktionen bereinigen (Admin/Don)
  @Post('cleanup')
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async cleanupExpiredSanctions() {
    return this.sanctionsService.cleanupExpiredSanctions();
  }

  // Statistiken (Admin/Don)
  @Get('stats')
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async getStats() {
    return this.sanctionsService.getSanctionStats();
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
          description: 'Wochenabgabe nicht innerhalb von 48 Stunden bezahlt',
          penalties: [
            { level: 1, amount: 200000, penalty: null },
            { level: 2, amount: 400000, penalty: null },
            { level: 3, amount: 500000, penalty: null },
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
}
