import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClothingService, ClothingTemplate, UserClothingData } from './clothing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clothing')
@UseGuards(JwtAuthGuard)
export class ClothingController {
  constructor(private clothingService: ClothingService) {}

  /**
   * Holt das Kleidungs-Template für den eigenen Rang
   * Für alle Benutzer
   */
  @Get('templates')
  async getMyTemplate(@Request() req): Promise<any> {
    // Gibt das Template für den Rang des Users zurück (flaches Format)
    const template = await this.clothingService.getTemplateForRole(req.user.role);
    return this.clothingService.flattenTemplate(template);
  }

  /**
   * Holt ein Template für eine bestimmte Rang-Gruppe
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
        item: data.maskItem ?? null,
        variation: data.maskVariation ?? null,
        customizable: data.maskCustomizable ?? false,
        color: data.maskColor ?? null,
      },
      torso: {
        item: data.torsoItem ?? null,
        variation: data.torsoVariation ?? null,
        customizable: data.torsoCustomizable ?? false,
        color: data.torsoColor ?? null,
      },
      tshirt: {
        item: data.tshirtItem ?? null,
        variation: data.tshirtVariation ?? null,
        customizable: data.tshirtCustomizable ?? false,
        color: data.tshirtColor ?? null,
      },
      veste: {
        item: data.vesteItem ?? null,
        variation: data.vesteVariation ?? null,
        customizable: data.vesteCustomizable ?? false,
        color: data.vesteColor ?? null,
      },
      hose: {
        item: data.hoseItem ?? null,
        variation: data.hoseVariation ?? null,
        customizable: data.hoseCustomizable ?? false,
        color: data.hoseColor ?? null,
      },
      schuhe: {
        item: data.schuheItem ?? null,
        variation: data.schuheVariation ?? null,
        customizable: data.schuheCustomizable ?? false,
        color: data.schuheColor ?? null,
      },
    };
    
    const result = await this.clothingService.upsertTemplate(req.user.role, rankGroup, structuredData);
    return this.clothingService.flattenTemplate(result);
  }

  /**
   * Holt die Kleidung für den aktuellen User
   */
  @Get('my-clothing')
  async getMyClothing(@Request() req): Promise<any> {
    return this.clothingService.getUserClothingFlat(req.user.userId);
  }

  /**
   * Holt die Kleidung für einen bestimmten User (nur Leaderschaft)
   */
  @Get('user/:userId')
  async getUserClothing(
    @Request() req,
    @Param('userId') userId: string
  ): Promise<{
    template: ClothingTemplate | null;
    userCustomization: UserClothingData | null;
    combinedClothing: any;
  }> {
    // Nur Leaderschaft darf andere User anschauen
    if (!this.clothingService.isLeadership(req.user.role)) {
      // Normale User dürfen nur ihre eigene Kleidung sehen
      if (userId !== req.user.userId) {
        throw new Error('Keine Berechtigung');
      }
    }
    return this.clothingService.getUserClothing(userId);
  }

  /**
   * Aktualisiert die individuelle Kleidung des aktuellen Users
   */
  @Put('my-clothing')
  async updateMyClothing(
    @Request() req,
    @Body() data: any
  ): Promise<any> {
    // Konvertiere flaches Format vom Frontend zu verschachteltem Format
    const structuredData: UserClothingData = {
      maske: (data.maskItem !== undefined && data.maskVariation !== undefined)
        ? { item: data.maskItem, variation: data.maskVariation }
        : undefined,
      torso: (data.torsoItem !== undefined && data.torsoVariation !== undefined)
        ? { item: data.torsoItem, variation: data.torsoVariation }
        : undefined,
      tshirt: (data.tshirtItem !== undefined && data.tshirtVariation !== undefined)
        ? { item: data.tshirtItem, variation: data.tshirtVariation }
        : undefined,
      veste: (data.vesteItem !== undefined && data.vesteVariation !== undefined)
        ? { item: data.vesteItem, variation: data.vesteVariation }
        : undefined,
      hose: (data.hoseItem !== undefined && data.hoseVariation !== undefined)
        ? { item: data.hoseItem, variation: data.hoseVariation }
        : undefined,
      schuhe: (data.schuheItem !== undefined && data.schuheVariation !== undefined)
        ? { item: data.schuheItem, variation: data.schuheVariation }
        : undefined,
    };
    
    await this.clothingService.updateUserClothing(req.user.userId, structuredData);
    
    // Gib die aktualisierten Daten im flachen Format zurück
    return this.clothingService.getUserClothingFlat(req.user.userId);
  }
}

