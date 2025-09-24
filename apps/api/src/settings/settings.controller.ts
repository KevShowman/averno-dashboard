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

  // Setting erstellen oder aktualisieren (El Patron, Don)
  @Put()
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async setSetting(@Body() setSettingDto: SetSettingDto) {
    return this.settingsService.setSetting(
      setSettingDto.key,
      setSettingDto.value,
      setSettingDto.type || 'string'
    );
  }

  // Setting löschen (El Patron, Don)
  @Delete(':key')
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async deleteSetting(@Param('key') key: string) {
    return this.settingsService.deleteSetting(key);
  }

  // Weekly Delivery Settings abrufen
  @Get('weekly-delivery/values')
  async getWeeklyDeliverySettings() {
    return this.settingsService.getWeeklyDeliverySettings();
  }

  // Weekly Delivery Settings setzen (El Patron, Don)
  @Put('weekly-delivery')
  @Roles(Role.EL_PATRON, Role.DON)
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
}