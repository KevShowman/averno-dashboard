import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CasaService {
  constructor(private prisma: PrismaService) {}

  async getCasaInfo() {
    // Versuche Settings zu laden, ignoriere Fehler wenn sie nicht existieren
    let location = null;
    let locationAdditional = null;
    
    try {
      location = await this.prisma.settings.findUnique({
        where: { key: 'casa_location' },
      });
    } catch (error) {
      // Setting existiert noch nicht, ignorieren
    }

    try {
      locationAdditional = await this.prisma.settings.findUnique({
        where: { key: 'casa_location_additional' },
      });
    } catch (error) {
      // Setting existiert noch nicht, ignorieren
    }

    // Filtere Platzhalter heraus und leere Strings
    const postalCode = location?.value && location.value !== 'N/A' && location.value.trim() !== '' 
      ? location.value 
      : null;
    const additionalInfo = locationAdditional?.value && locationAdditional.value !== 'N/A' && locationAdditional.value.trim() !== '' 
      ? locationAdditional.value 
      : null;

    return {
      postalCode,
      additionalInfo,
    };
  }

  async updateLocation(postalCode: string, additionalInfo: string) {
    // Verwende Platzhalter wenn leer, um CHECK CONSTRAINT zu umgehen
    const safePostalCode = postalCode.trim() || 'N/A';
    const safeAdditionalInfo = additionalInfo.trim() || 'N/A';

    await this.prisma.settings.upsert({
      where: { key: 'casa_location' },
      update: { value: safePostalCode },
      create: { key: 'casa_location', value: safePostalCode },
    });

    await this.prisma.settings.upsert({
      where: { key: 'casa_location_additional' },
      update: { value: safeAdditionalInfo },
      create: { key: 'casa_location_additional', value: safeAdditionalInfo },
    });

    return { postalCode: safePostalCode, additionalInfo: safeAdditionalInfo };
  }
}
