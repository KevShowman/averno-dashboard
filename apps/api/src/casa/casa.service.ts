import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { unlink } from 'fs/promises';
import { join } from 'path';

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

    const images = await this.prisma.casaImage.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Filtere Platzhalter heraus und leere Strings
    const postalCode = location?.value && location.value !== 'Noch nicht festgelegt' && location.value.trim() !== '' 
      ? location.value 
      : null;
    const additionalInfo = locationAdditional?.value && locationAdditional.value !== 'Noch nicht festgelegt' && locationAdditional.value.trim() !== '' 
      ? locationAdditional.value 
      : null;

    return {
      postalCode,
      additionalInfo,
      images: images.map(img => ({
        id: img.id,
        filename: img.filename,
        url: `/uploads/casa/${img.filename}`,
        createdAt: img.createdAt,
      })),
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

  async addImage(filename: string, path: string) {
    const image = await this.prisma.casaImage.create({
      data: {
        filename,
        path,
      },
    });

    return {
      id: image.id,
      filename: image.filename,
      url: `/uploads/casa/${image.filename}`,
      createdAt: image.createdAt,
    };
  }

  async deleteImage(id: string) {
    const image = await this.prisma.casaImage.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Bild nicht gefunden');
    }

    // Datei löschen
    try {
      await unlink(image.path);
    } catch (error) {
      console.error('Fehler beim Löschen der Datei:', error);
    }

    // Datenbank-Eintrag löschen
    await this.prisma.casaImage.delete({
      where: { id },
    });

    return { success: true };
  }
}

