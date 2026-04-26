import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface SetSettingDto {
  key: string;
  value: any;
  type?: string;
}

interface WeeklyDeliverySettingsDto {
  packages: number;
  moneyPerPackage: number;
}

interface XiaoMotorsSettingsDto {
  codewort: string;
  enabled: boolean;
}

interface BloodListSettingsDto {
  bloodInChannelId: string;
  bloodOutChannelId: string;
}

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  // Alle Settings abrufen
  @Get()
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  // Setting nach Key abrufen
  @Get(':key')
  async getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  // Setting erstellen oder aktualisieren (Leaderschaft)
  @Put()
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async setSetting(@Body() setSettingDto: SetSettingDto) {
    return this.settingsService.setSetting(
      setSettingDto.key,
      setSettingDto.value,
      setSettingDto.type || 'string'
    );
  }

  // Setting löschen (Leaderschaft)
  @Delete(':key')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async deleteSetting(@Param('key') key: string) {
    return this.settingsService.deleteSetting(key);
  }

  // Weekly Delivery Settings abrufen
  @Get('weekly-delivery/values')
  async getWeeklyDeliverySettings() {
    return this.settingsService.getWeeklyDeliverySettings();
  }

  // Weekly Delivery Settings setzen (Leaderschaft)
  @Put('weekly-delivery')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async setWeeklyDeliverySettings(@Body() settingsDto: WeeklyDeliverySettingsDto) {
    if (settingsDto.packages <= 0) {
      throw new Error('Pakete müssen größer als 0 sein');
    }
    if (settingsDto.moneyPerPackage <= 0) {
      throw new Error('Geld pro Paket muss größer als 0 sein');
    }

    return this.settingsService.setWeeklyDeliverySettings(
      settingsDto.packages,
      settingsDto.moneyPerPackage
    );
  }

  // Xiao Motors Settings abrufen (alle authentifizierten User)
  @Get('xiao-motors/values')
  async getXiaoMotorsSettings() {
    return this.settingsService.getXiaoMotorsSettings();
  }

  // Xiao Motors Settings setzen (Leaderschaft)
  @Put('xiao-motors')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async setXiaoMotorsSettings(@Body() settingsDto: XiaoMotorsSettingsDto) {
    return this.settingsService.setXiaoMotorsSettings(
      settingsDto.codewort,
      settingsDto.enabled
    );
  }

  // Blood List Channel Settings abrufen (alle authentifizierten User)
  @Get('bloodlist/values')
  async getBloodListSettings() {
    return this.settingsService.getBloodListSettings();
  }

  // Blood List Channel Settings setzen (Leaderschaft)
  @Put('bloodlist')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async setBloodListSettings(@Body() settingsDto: BloodListSettingsDto) {
    return this.settingsService.setBloodListSettings(
      settingsDto.bloodInChannelId,
      settingsDto.bloodOutChannelId
    );
  }

  // Blood In Discord Rollen abrufen (nur Patron)
  @Get('bloodlist/roles')
  async getBloodInDiscordRoles() {
    return { roleIds: await this.settingsService.getBloodInDiscordRoles() };
  }

  // Blood In Discord Rollen setzen (NUR Patron)
  @Put('bloodlist/roles')
  @Roles(Role.PATRON, Role.ADMIN)
  @UseGuards(RolesGuard)
  async setBloodInDiscordRoles(@Body() body: { roleIds: string[] }) {
    return this.settingsService.setBloodInDiscordRoles(body.roleIds);
  }
}