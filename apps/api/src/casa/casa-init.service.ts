import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class CasaInitService implements OnModuleInit {
  private readonly defaultImages = [
    { filename: 'default-aussen-einfahrt.png', path: './uploads/casa/default-aussen-einfahrt.png' },
    { filename: 'default-aussen-terasseundpool.png', path: './uploads/casa/default-aussen-terasseundpool.png' },
    { filename: 'default-innen-barbereich.png', path: './uploads/casa/default-innen-barbereich.png' },
    { filename: 'default-innen-wohnzimmer.png', path: './uploads/casa/default-innen-wohnzimmer.png' },
  ];

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeDefaultImages();
  }

  private async initializeDefaultImages() {
    for (const image of this.defaultImages) {
      const imagePath = join(process.cwd(), image.path);
      
      // Prüfe ob das Bild physisch existiert
      if (!existsSync(imagePath)) {
        console.warn(`Default Casa image not found: ${imagePath}`);
        continue;
      }

      // Prüfe ob das Bild bereits in der DB existiert
      const existing = await this.prisma.casaImage.findFirst({
        where: { filename: image.filename },
      });

      if (!existing) {
        await this.prisma.casaImage.create({
          data: {
            filename: image.filename,
            path: image.path,
          },
        });
        console.log(`Initialized default Casa image: ${image.filename}`);
      }
    }
  }
}

