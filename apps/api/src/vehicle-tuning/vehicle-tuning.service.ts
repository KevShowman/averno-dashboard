import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class VehicleTuningService {
  constructor(private settingsService: SettingsService) {}

  async getTuningSpecs() {
    // Xiao Motors Settings aus der Datenbank holen
    const xiaoSettings = await this.settingsService.getXiaoMotorsSettings();

    return {
      workshop: {
        name: 'Xiao Motors',
        // Kein Codewort mehr benötigt - einfach sagen dass man zu La Santa Calavera gehört
        codeword: xiaoSettings.codewort || null,
        hinweis: xiaoSettings.hinweis,
        enabled: xiaoSettings.enabled,
        discounts: {
          familyVehicles: '50%',
          privateVehicles: '20%',
        },
      },
      paint: {
        primary: {
          from: 'oben links',
          right: 3,
          down: 18,
        },
        secondary: {
          from: 'oben links',
          right: 3,
          down: 18,
        },
        pearlEffect: {
          from: 'oben links',
          right: 8,
          down: 5,
        },
        primaryType: 'Matte',
        secondaryType: 'Matte',
      },
      lights: {
        xenon: 'Goldene Dusche',
        neon: {
          from: 'oben links',
          right: 2,
          down: 9,
        },
      },
      windows: 'Pures Schwarz',
      licensePlate: 'Gelb auf Schwarz',
    };
  }
}

