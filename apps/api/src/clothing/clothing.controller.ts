import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClothingService, ClothingTemplate } from './clothing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}
