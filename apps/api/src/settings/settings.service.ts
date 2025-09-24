import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // Alle Settings abrufen
  async getAllSettings() {
    return this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  // Setting nach Key abrufen
  async getSetting(key: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      return null;
    }

    // Parse value basierend auf type
    return this.parseSettingValue(setting.value, setting.type);
  }

  // Setting erstellen oder aktualisieren
  async setSetting(key: string, value: any, type: string = 'string') {
    const stringValue = this.stringifyValue(value, type);

    return this.prisma.setting.upsert({
      where: { key },
      update: {
        value: stringValue,
        type,
      },
      create: {
        key,
        value: stringValue,
        type,
      },
    });
  }

  // Setting löschen
  async deleteSetting(key: string) {
    return this.prisma.setting.delete({
      where: { key },
    });
  }

  // Weekly Delivery Settings
  async getWeeklyDeliverySettings() {
    const packages = await this.getSetting('weekly_delivery_packages') || 300;
    const moneyPerPackage = await this.getSetting('weekly_delivery_money_per_package') || 1000;

    return {
      packages: Number(packages),
      moneyPerPackage: Number(moneyPerPackage),
    };
  }

  async setWeeklyDeliverySettings(packages: number, moneyPerPackage: number) {
    await this.setSetting('weekly_delivery_packages', packages, 'number');
    await this.setSetting('weekly_delivery_money_per_package', moneyPerPackage, 'number');

    return {
      packages: Number(packages),
      moneyPerPackage: Number(moneyPerPackage),
    };
  }

  // Helper methods
  private parseSettingValue(value: string, type: string) {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }

  private stringifyValue(value: any, type: string): string {
    switch (type) {
      case 'number':
      case 'boolean':
        return String(value);
      case 'json':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }
}