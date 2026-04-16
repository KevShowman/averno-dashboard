import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ClothingService, ClothingTemplate } from './clothing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as fs from 'fs';

@Controller('clothing')
@UseGuards(JwtAuthGuard)
export class ClothingController {
  constructor(private clothingService: ClothingService) {}

  /**
   * Holt das Kleidungs-Template für den eigenen Rang und Geschlecht
   * Für alle Benutzer
   */
  @Get('my-clothing')
  async getMyClothing(@Request() req): Promise<any> {
    // Gibt das geschlechts-spezifische Template für den User zurück
    return this.clothingService.getUserClothing(req.user.id);
  }

  /**
   * Alias für my-clothing (für ClothingPage.tsx)
   */
  @Get('templates')
  async getMyTemplate(@Request() req): Promise<any> {
    return this.clothingService.getUserClothing(req.user.id);
  }

  /**
   * Holt ein Template für eine bestimmte Rang-Gruppe (mit BEIDEN Geschlechtern)
   * Nur für Leaderschaft
   */
  @Get('templates/:rankGroup')
  async getTemplateByRankGroup(
    @Request() req,
    @Param('rankGroup') rankGroup: string
  ): Promise<any> {
    // Nur Leaderschaft darf Templates abrufen
    if (!this.clothingService.isLeadership(req.user.role)) {
      return this.clothingService.flattenTemplate(null);
    }
    const template = await this.clothingService.getTemplateByRankGroup(rankGroup);
    return this.clothingService.flattenTemplate(template);
  }

  /**
   * Erstellt oder aktualisiert ein Kleidungs-Template
   * Nur für Leaderschaft
   */
  @Post('templates/:rankGroup')
  async upsertTemplate(
    @Request() req,
    @Param('rankGroup') rankGroup: string,
    @Body() data: any
  ): Promise<any> {
    // Konvertiere flaches Format vom Frontend zu verschachteltem Format
    const structuredData: Partial<ClothingTemplate> = {
      maske: {
        itemMale: data.maskItemMale ?? null,
        variationMale: data.maskVariationMale ?? null,
        customizableMale: data.maskCustomizableMale ?? false,
        colorMale: data.maskColorMale ?? null,
        itemFemale: data.maskItemFemale ?? null,
        variationFemale: data.maskVariationFemale ?? null,
        customizableFemale: data.maskCustomizableFemale ?? false,
        colorFemale: data.maskColorFemale ?? null,
      },
      torso: {
        itemMale: data.torsoItemMale ?? null,
        variationMale: data.torsoVariationMale ?? null,
        customizableMale: data.torsoCustomizableMale ?? false,
        colorMale: data.torsoColorMale ?? null,
        itemFemale: data.torsoItemFemale ?? null,
        variationFemale: data.torsoVariationFemale ?? null,
        customizableFemale: data.torsoCustomizableFemale ?? false,
        colorFemale: data.torsoColorFemale ?? null,
      },
      tshirt: {
        itemMale: data.tshirtItemMale ?? null,
        variationMale: data.tshirtVariationMale ?? null,
        customizableMale: data.tshirtCustomizableMale ?? false,
        colorMale: data.tshirtColorMale ?? null,
        itemFemale: data.tshirtItemFemale ?? null,
        variationFemale: data.tshirtVariationFemale ?? null,
        customizableFemale: data.tshirtCustomizableFemale ?? false,
        colorFemale: data.tshirtColorFemale ?? null,
      },
      veste: {
        itemMale: data.vesteItemMale ?? null,
        variationMale: data.vesteVariationMale ?? null,
        customizableMale: data.vesteCustomizableMale ?? false,
        colorMale: data.vesteColorMale ?? null,
        itemFemale: data.vesteItemFemale ?? null,
        variationFemale: data.vesteVariationFemale ?? null,
        customizableFemale: data.vesteCustomizableFemale ?? false,
        colorFemale: data.vesteColorFemale ?? null,
      },
      hose: {
        itemMale: data.hoseItemMale ?? null,
        variationMale: data.hoseVariationMale ?? null,
        customizableMale: data.hoseCustomizableMale ?? false,
        colorMale: data.hoseColorMale ?? null,
        itemFemale: data.hoseItemFemale ?? null,
        variationFemale: data.hoseVariationFemale ?? null,
        customizableFemale: data.hoseCustomizableFemale ?? false,
        colorFemale: data.hoseColorFemale ?? null,
      },
      schuhe: {
        itemMale: data.schuheItemMale ?? null,
        variationMale: data.schuheVariationMale ?? null,
        customizableMale: data.schuheCustomizableMale ?? false,
        colorMale: data.schuheColorMale ?? null,
        itemFemale: data.schuheItemFemale ?? null,
        variationFemale: data.schuheVariationFemale ?? null,
        customizableFemale: data.schuheCustomizableFemale ?? false,
        colorFemale: data.schuheColorFemale ?? null,
      },
      rucksack: {
        itemMale: data.rucksackItemMale ?? null,
        variationMale: data.rucksackVariationMale ?? null,
        customizableMale: data.rucksackCustomizableMale ?? false,
        colorMale: data.rucksackColorMale ?? null,
        itemFemale: data.rucksackItemFemale ?? null,
        variationFemale: data.rucksackVariationFemale ?? null,
        customizableFemale: data.rucksackCustomizableFemale ?? false,
        colorFemale: data.rucksackColorFemale ?? null,
      },
    };
    
    const result = await this.clothingService.upsertTemplate(req.user.role, rankGroup, structuredData);
    return this.clothingService.flattenTemplate(result);
  }

  // ============ MALE OUTFITS ============

  /**
   * Holt alle 5 Männer-Outfits
   */
  @Get('male-outfits')
  async getMaleOutfits() {
    return this.clothingService.getAllMaleOutfits();
  }

  /**
   * Holt ein einzelnes Outfit
   */
  @Get('male-outfits/:outfitNumber')
  async getMaleOutfit(@Param('outfitNumber') outfitNumber: string) {
    return this.clothingService.getMaleOutfit(parseInt(outfitNumber));
  }

  /**
   * Aktualisiert ein Männer-Outfit (nur Leadership)
   */
  @Put('male-outfits/:outfitNumber')
  async updateMaleOutfit(
    @Request() req,
    @Param('outfitNumber') outfitNumber: string,
    @Body() data: {
      name?: string;
      maskItem?: number | null;
      maskVariation?: number | null;
      torsoItem?: number | null;
      torsoVariation?: number | null;
      tshirtItem?: number | null;
      tshirtVariation?: number | null;
      vesteItem?: number | null;
      vesteVariation?: number | null;
      hoseItem?: number | null;
      hoseVariation?: number | null;
      schuheItem?: number | null;
      schuheVariation?: number | null;
      rucksackItem?: number | null;
      rucksackVariation?: number | null;
    },
  ) {
    return this.clothingService.updateMaleOutfit(req.user.role, parseInt(outfitNumber), data);
  }

  /**
   * Upload Bild für Outfit
   */
  @Post('male-outfits/:outfitNumber/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/outfits';
          // Erstelle Verzeichnis wenn nicht vorhanden
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const outfitNumber = req.params.outfitNumber;
          const ext = extname(file.originalname);
          cb(null, `outfit-${outfitNumber}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(new BadRequestException('Nur Bilddateien erlaubt'), false);
        } else {
          cb(null, true);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadOutfitImage(
    @Request() req,
    @Param('outfitNumber') outfitNumber: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Keine Datei hochgeladen');
    }
    
    return this.clothingService.updateOutfitImage(
      req.user.role,
      parseInt(outfitNumber),
      file.filename,
    );
  }
}
