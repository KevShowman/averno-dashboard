import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, WeaponType } from '@prisma/client';

// DTOs
interface CreateWeaponDto {
  userId: string;
  weaponType: WeaponType;
  receivedAt?: string;
  lastLostAt?: string;
  hasTaschenlampe?: boolean;
  hasTrommelmagazin?: boolean;
  hasSchalldaempfer?: boolean;
  hasGriff?: boolean;
  hasErwMagazin?: boolean;
  hasZielfernrohr?: boolean;
  note?: string;
}

interface UpdateWeaponDto {
  weaponType?: WeaponType;
  receivedAt?: string;
  lastLostAt?: string;
  hasTaschenlampe?: boolean;
  hasTrommelmagazin?: boolean;
  hasSchalldaempfer?: boolean;
  hasGriff?: boolean;
  hasErwMagazin?: boolean;
  hasZielfernrohr?: boolean;
  note?: string;
}

interface CreateVestDto {
  userId: string;
  quantity: number;
  receivedAt?: string;
  note?: string;
}

interface CreateAmmoDto {
  userId: string;
  quantity: number;
  receivedAt?: string;
  note?: string;
}

@Controller('equipment')
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  constructor(private equipmentService: EquipmentService) {}

  // ============ WAFFEN ============

  // Alle Waffen abrufen (Leadership)
  @Get('weapons')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async getAllWeapons() {
    return this.equipmentService.getAllWeapons();
  }

  // Waffen eines Users abrufen
  @Get('weapons/user/:userId')
  async getUserWeapons(@Param('userId') userId: string) {
    return this.equipmentService.getUserWeapons(userId);
  }

  // Meine Waffen abrufen
  @Get('weapons/my')
  async getMyWeapons(@Request() req) {
    return this.equipmentService.getUserWeapons(req.user.id);
  }

  // Waffe erstellen (Leadership + Logistica)
  @Post('weapons')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async createWeapon(@Body() data: CreateWeaponDto, @Request() req) {
    return this.equipmentService.createWeapon(data, req.user.id);
  }

  // Waffe aktualisieren (Leadership + Logistica)
  @Patch('weapons/:id')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async updateWeapon(@Param('id') id: string, @Body() data: UpdateWeaponDto, @Request() req) {
    return this.equipmentService.updateWeapon(id, data, req.user.id);
  }

  // Waffe löschen (Leadership + Logistica)
  @Delete('weapons/:id')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async deleteWeapon(@Param('id') id: string, @Request() req) {
    return this.equipmentService.deleteWeapon(id, req.user.id);
  }

  // ============ WESTEN ============

  // Alle Westen abrufen (Leadership)
  @Get('vests')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async getAllVests() {
    return this.equipmentService.getAllVests();
  }

  // Westen eines Users abrufen
  @Get('vests/user/:userId')
  async getUserVests(@Param('userId') userId: string) {
    return this.equipmentService.getUserVests(userId);
  }

  // Meine Westen abrufen
  @Get('vests/my')
  async getMyVests(@Request() req) {
    return this.equipmentService.getUserVests(req.user.id);
  }

  // Westen erstellen (Leadership + Logistica)
  @Post('vests')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async createVest(@Body() data: CreateVestDto, @Request() req) {
    return this.equipmentService.createVest(data, req.user.id);
  }

  // Westen-Eintrag löschen (Leadership + Logistica)
  @Delete('vests/:id')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async deleteVest(@Param('id') id: string, @Request() req) {
    return this.equipmentService.deleteVest(id, req.user.id);
  }

  // ============ MUNITION ============

  // Alle Munition abrufen (Leadership)
  @Get('ammo')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async getAllAmmo() {
    return this.equipmentService.getAllAmmo();
  }

  // Munition eines Users abrufen
  @Get('ammo/user/:userId')
  async getUserAmmo(@Param('userId') userId: string) {
    return this.equipmentService.getUserAmmo(userId);
  }

  // Meine Munition abrufen
  @Get('ammo/my')
  async getMyAmmo(@Request() req) {
    return this.equipmentService.getUserAmmo(req.user.id);
  }

  // Munition erstellen (Leadership + Logistica)
  @Post('ammo')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async createAmmo(@Body() data: CreateAmmoDto, @Request() req) {
    return this.equipmentService.createAmmo(data, req.user.id);
  }

  // Munitions-Eintrag löschen (Leadership + Logistica)
  @Delete('ammo/:id')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async deleteAmmo(@Param('id') id: string, @Request() req) {
    return this.equipmentService.deleteAmmo(id, req.user.id);
  }

  // ============ ÜBERSICHT ============

  // Komplette Ausrüstung eines Users
  @Get('user/:userId')
  async getUserEquipment(@Param('userId') userId: string) {
    return this.equipmentService.getUserEquipment(userId);
  }

  // Meine komplette Ausrüstung
  @Get('my')
  async getMyEquipment(@Request() req) {
    return this.equipmentService.getUserEquipment(req.user.id);
  }

  // Statistiken (Leadership)
  @Get('stats')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async getStats() {
    return this.equipmentService.getStats();
  }

  // Waffentypen abrufen
  @Get('weapon-types')
  async getWeaponTypes() {
    return this.equipmentService.getWeaponTypes();
  }

  // Aufsätze abrufen
  @Get('attachments')
  async getAttachments() {
    return this.equipmentService.getAttachments();
  }

  // Waffen-Empfehlungen (Ampelsystem)
  @Get('recommendations')
  @Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async getWeaponRecommendations() {
    return this.equipmentService.getWeaponRecommendations();
  }
}
