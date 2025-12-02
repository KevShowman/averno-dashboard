import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { BloodListService } from './bloodlist.service';

interface BloodInDto {
  vorname: string;
  nachname: string;
  telefon: number;
  steam: string;
  bloodinDurch: string;
}

interface BloodOutDto {
  identifier: string; // Telefon oder "Vorname Nachname"
  grund: string;
}

interface LinkDiscordUserDto {
  discordId: string;
  vorname: string;
  nachname: string;
  telefon: number;
  steam: string;
  bloodinDurch: string;
}

@Controller('bloodlist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BloodListController {
  constructor(private bloodListService: BloodListService) {}

  // Blood In - Leaderschaft + Formación
  @Post('blood-in')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.FORMACION)
  async bloodIn(@Body() bloodInDto: BloodInDto, @CurrentUser() user: User) {
    return this.bloodListService.bloodIn(
      bloodInDto.vorname,
      bloodInDto.nachname,
      bloodInDto.telefon,
      bloodInDto.steam,
      bloodInDto.bloodinDurch,
    );
  }

  // Blood Out - NUR Leaderschaft (NICHT Formación!)
  @Post('blood-out')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  async bloodOut(@Body() bloodOutDto: BloodOutDto, @CurrentUser() user: User) {
    // Verwende den eingeloggten User als bloodoutDurch
    const durchUser = user.icFirstName && user.icLastName
      ? `${user.icFirstName} ${user.icLastName}`
      : user.username;

    return this.bloodListService.bloodOut(
      bloodOutDto.identifier,
      bloodOutDto.grund,
      durchUser,
    );
  }

  // Status der Blood List Settings - alle authentifizierten User
  @Get('status')
  async getBloodListStatus() {
    return this.bloodListService.getBloodListStatus();
  }

  // Aktive Blood List - Alle authentifizierten User
  @Get('active')
  async getActiveBloodList() {
    return this.bloodListService.getActiveBloodList();
  }

  // Blood Out Historie - Nur für Leaderschaft
  @Get('history')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  async getBloodOutHistory() {
    return this.bloodListService.getBloodOutHistory();
  }

  // Alle Records - Nur El Patron
  @Get('all')
  @Roles(Role.EL_PATRON)
  async getAllRecords() {
    return this.bloodListService.getAllRecords();
  }

  // Stats - Alle authentifizierten User
  @Get('stats')
  async getStats() {
    return this.bloodListService.getStats();
  }

  // Suche - Alle authentifizierten User
  @Get('search')
  async searchRecords(@Query('q') query: string) {
    return this.bloodListService.searchRecords(query);
  }

  // Discord User die noch nicht zugewiesen sind - Leaderschaft + Formación
  // WICHTIG: Diese Route muss VOR :id stehen!
  @Get('discord/unassigned')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.FORMACION)
  async getUnassignedDiscordUsers() {
    return this.bloodListService.getUnassignedDiscordUsers();
  }

  // Ghost Users - User die nicht mehr im Discord sind - NUR Leaderschaft (nicht Formación)
  // WICHTIG: Diese Route muss VOR :id stehen!
  @Get('discord/ghost-users')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
  async getGhostUsers() {
    return this.bloodListService.getGhostUsers();
  }

  // Discord User mit Blood Record verknüpfen (Blood In) - Leaderschaft + Formación
  @Post('link-discord-user')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.FORMACION)
  async linkDiscordUser(@Body() linkDto: LinkDiscordUserDto, @CurrentUser() user: User) {
    return this.bloodListService.linkDiscordUserToBloodRecord(
      linkDto.discordId,
      linkDto.vorname,
      linkDto.nachname,
      linkDto.telefon,
      linkDto.steam,
      linkDto.bloodinDurch,
    );
  }

  // Einzelner Record - Alle authentifizierten User
  // WICHTIG: Diese Route muss ZULETZT stehen, da :id alles matcht!
  @Get(':id')
  async getRecordById(@Param('id') id: string) {
    return this.bloodListService.getRecordById(id);
  }
}

