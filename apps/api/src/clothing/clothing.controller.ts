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
   * Holt alle Kleidungs-Templates
   * Nur für Leaderschaft
   */
  @Get('templates')
  async getAllTemplates(@Request() req): Promise<ClothingTemplate[]> {
    // Nur Leaderschaft darf alle Templates sehen
    if (!this.clothingService.isLeadership(req.user.role)) {
      return [];
    }
    return this.clothingService.getAllTemplates();
  }

  /**
   * Holt ein Template für eine bestimmte Rang-Gruppe
   * Nur für Leaderschaft
   */
  @Get('templates/:rankGroup')
  async getTemplateByRankGroup(
    @Request() req,
    @Param('rankGroup') rankGroup: string
  ): Promise<ClothingTemplate | null> {
    // Nur Leaderschaft darf Templates abrufen
    if (!this.clothingService.isLeadership(req.user.role)) {
      return null;
    }
    return this.clothingService.getTemplateByRankGroup(rankGroup);
  }

  /**
   * Erstellt oder aktualisiert ein Kleidungs-Template
   * Nur für Leaderschaft
   */
  @Post('templates/:rankGroup')
  async upsertTemplate(
    @Request() req,
    @Param('rankGroup') rankGroup: string,
    @Body() data: Partial<ClothingTemplate>
  ): Promise<ClothingTemplate> {
    return this.clothingService.upsertTemplate(req.user.role, rankGroup, data);
  }

  /**
   * Holt die Kleidung für den aktuellen User
   */
  @Get('my-clothing')
  async getMyClothing(@Request() req): Promise<{
    template: ClothingTemplate | null;
    userCustomization: UserClothingData | null;
    combinedClothing: any;
  }> {
    return this.clothingService.getUserClothing(req.user.userId);
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
    @Body() data: UserClothingData
  ): Promise<UserClothingData> {
    return this.clothingService.updateUserClothing(req.user.userId, data);
  }
}

