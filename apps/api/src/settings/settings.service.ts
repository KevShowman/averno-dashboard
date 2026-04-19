import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // Alle Settings abrufen
  async getAllSettings() {
    return this.prisma.settings.findMany({
      orderBy: { key: 'asc' },
    });
  }

  // Setting nach Key abrufen
  async getSetting(key: string) {
    const setting = await this.prisma.settings.findUnique({
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
    const jsonValue = this.jsonifyValue(value, type);

    return this.prisma.settings.upsert({
      where: { key },
      update: {
        value: jsonValue,
        type,
      },
      create: {
        key,
        value: jsonValue,
        type,
      },
    });
  }

  // Setting löschen
  async deleteSetting(key: string) {
    return this.prisma.settings.delete({
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

  // Xiao Motors Settings
  async getXiaoMotorsSettings() {
    const codewort = await this.getSetting('xiao_motors_codewort') || '';
    const enabled = await this.getSetting('xiao_motors_enabled') || false;

    return {
      codewort: String(codewort),
      enabled: Boolean(enabled),
      // Hinweis: Kein Codewort mehr benötigt - nur sagen dass man zu La Santa Calavera gehört
      hinweis: 'Kein Codewort mehr benötigt - einfach sagen, dass man zu La Santa Calavera gehört',
    };
  }

  async setXiaoMotorsSettings(codewort: string, enabled: boolean) {
    await this.setSetting('xiao_motors_codewort', codewort, 'string');
    await this.setSetting('xiao_motors_enabled', enabled, 'boolean');

    return {
      codewort,
      enabled,
    };
  }

  // Blood List Channel Settings
  async getBloodListSettings() {
    const bloodInChannelId = await this.getSetting('bloodlist_blood_in_channel_id') || '';
    const bloodOutChannelId = await this.getSetting('bloodlist_blood_out_channel_id') || '';

    return {
      bloodInChannelId: String(bloodInChannelId),
      bloodOutChannelId: String(bloodOutChannelId),
      isConfigured: Boolean(bloodInChannelId && bloodOutChannelId),
    };
  }

  async setBloodListSettings(bloodInChannelId: string, bloodOutChannelId: string) {
    await this.setSetting('bloodlist_blood_in_channel_id', bloodInChannelId, 'string');
    await this.setSetting('bloodlist_blood_out_channel_id', bloodOutChannelId, 'string');

    return {
      bloodInChannelId,
      bloodOutChannelId,
      isConfigured: Boolean(bloodInChannelId && bloodOutChannelId),
    };
  }

  // Blood In Discord Rollen Settings (nur Patron)
  async getBloodInDiscordRoles(): Promise<string[]> {
    const roles = await this.getSetting('bloodlist_blood_in_discord_roles');
    if (!roles) return [];
    
    // Falls es ein String ist, parsen
    if (typeof roles === 'string') {
      try {
        return JSON.parse(roles);
      } catch {
        return [];
      }
    }
    
    // Falls es bereits ein Array ist
    if (Array.isArray(roles)) {
      return roles;
    }
    
    return [];
  }

  async setBloodInDiscordRoles(roleIds: string[]) {
    await this.setSetting('bloodlist_blood_in_discord_roles', roleIds, 'json');
    return { roleIds };
  }

  // Helper methods
  private parseSettingValue(value: any, type: string) {
    switch (type) {
      case 'number':
        return typeof value === 'number' ? value : Number(value);
      case 'boolean':
        return typeof value === 'boolean' ? value : value === 'true';
      case 'json':
        return typeof value === 'object' ? value : JSON.parse(value);
      default:
        return typeof value === 'string' ? value : String(value);
    }
  }

  private jsonifyValue(value: any, type: string): any {
    switch (type) {
      case 'number':
        return typeof value === 'number' ? value : Number(value);
      case 'boolean':
        return typeof value === 'boolean' ? value : value === 'true';
      case 'json':
        return typeof value === 'object' ? value : JSON.parse(String(value));
      default:
        return String(value);
    }
  }
}