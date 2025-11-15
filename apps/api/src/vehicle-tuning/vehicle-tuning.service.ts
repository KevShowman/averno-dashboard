import { Injectable } from '@nestjs/common';

@Injectable()
export class VehicleTuningService {
  async getTuningSpecs() {
    return {
      workshop: {
        name: 'Xiao Motors',
        codeword: 'WIRD_VOM_ADMIN_GESETZT', // Placeholder - kann über Settings verwaltet werden
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

