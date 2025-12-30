import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PartnerService } from './partner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('partner')
export class PartnerController {
  constructor(private partnerService: PartnerService) {}

  // ============ PUBLIC PARTNER REQUEST ENDPOINT ============
  
  @Post('submit-request')
  async submitPartnerRequest(
    @Body() body: {
      discordId: string;
      username: string;
      avatarUrl?: string;
      familyName: string;
      reason: string;
    },
    @Res() res: Response,
  ) {
    try {
      const result = await this.partnerService.submitPartnerAccessRequest(body);
      
      // Clear the partner request cookie
      res.clearCookie('partner_request_data');
      
      return res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        message: error.message || 'Fehler beim Einreichen der Anfrage' 
      });
    }
  }

  // ============ ACCESS REQUESTS ============

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  async getAllAccessRequests(@CurrentUser() user: User) {
    return this.partnerService.getAllAccessRequests(user);
  }

  @Get('requests/pending')
  @UseGuards(JwtAuthGuard)
  async getPendingAccessRequests(@CurrentUser() user: User) {
    return this.partnerService.getPendingAccessRequests(user);
  }

  @Get('requests/pending/count')
  @UseGuards(JwtAuthGuard)
  async getPendingRequestCount(@CurrentUser() user: User) {
    const count = await this.partnerService.getPendingRequestCount(user);
    return { count };
  }

  @Post('requests/:id/approve')
  @UseGuards(JwtAuthGuard)
  async approveAccessRequest(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.partnerService.approveAccessRequest(user, id);
  }

  @Post('requests/:id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectAccessRequest(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { reviewNote?: string },
  ) {
    return this.partnerService.rejectAccessRequest(user, id, body.reviewNote);
  }

  // ============ ACTIVE PARTNERS ============

  @Get('active')
  @UseGuards(JwtAuthGuard)
  async getActivePartners(@CurrentUser() user: User) {
    return this.partnerService.getActivePartners(user);
  }

  @Delete('active/:id')
  @UseGuards(JwtAuthGuard)
  async revokePartnerAccess(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.partnerService.revokePartnerAccess(user, id);
  }

  // ============ MANAGEMENT PERMISSIONS ============

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  async getAllPermissions(@CurrentUser() user: User) {
    return this.partnerService.getAllPartnerManagementPermissions(user);
  }

  @Post('permissions/:userId')
  @UseGuards(JwtAuthGuard)
  async grantPermission(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
  ) {
    return this.partnerService.grantPartnerManagementPermission(user, userId);
  }

  @Delete('permissions/:userId')
  @UseGuards(JwtAuthGuard)
  async revokePermission(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
  ) {
    return this.partnerService.revokePartnerManagementPermission(user, userId);
  }

  @Get('permissions/check')
  @UseGuards(JwtAuthGuard)
  async checkPermission(@CurrentUser() user: User) {
    const hasPermission = await this.partnerService.hasPartnerManagementPermission(user.id);
    return { hasPermission };
  }

  // ============ FAMILY SUGGESTIONS ============

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  async getAllSuggestions(@CurrentUser() user: User) {
    return this.partnerService.getAllFamilySuggestions(user);
  }

  @Get('suggestions/pending')
  @UseGuards(JwtAuthGuard)
  async getPendingSuggestions(@CurrentUser() user: User) {
    return this.partnerService.getPendingFamilySuggestions(user);
  }

  @Get('suggestions/pending/count')
  @UseGuards(JwtAuthGuard)
  async getPendingSuggestionCount(@CurrentUser() user: User) {
    const count = await this.partnerService.getPendingSuggestionCount(user);
    return { count };
  }

  @Post('suggestions')
  @UseGuards(JwtAuthGuard)
  async createSuggestion(
    @CurrentUser() user: User,
    @Body() body: {
      type: string;
      familyContactId?: string;
      familyName: string;
      familyStatus?: string;
      propertyZip?: string;
      contact1FirstName?: string;
      contact1LastName?: string;
      contact1Phone?: string;
      contact2FirstName?: string;
      contact2LastName?: string;
      contact2Phone?: string;
      notes?: string;
      mapName?: string;
      mapX?: number;
      mapY?: number;
      mapIcon?: string;
    },
  ) {
    return this.partnerService.createFamilySuggestion(user, body as any);
  }

  @Post('suggestions/:id/approve')
  @UseGuards(JwtAuthGuard)
  async approveSuggestion(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.partnerService.approveFamilySuggestion(user, id);
  }

  @Post('suggestions/:id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectSuggestion(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { reviewNote?: string },
  ) {
    return this.partnerService.rejectFamilySuggestion(user, id, body.reviewNote);
  }

  @Delete('suggestions/:id')
  @UseGuards(JwtAuthGuard)
  async deleteSuggestion(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.partnerService.deleteFamilySuggestion(user, id);
  }

  // ============ PARTNER DATA ACCESS ============

  @Get('families')
  @UseGuards(JwtAuthGuard)
  async getFamiliesForPartner(@CurrentUser() user: User) {
    return this.partnerService.getFamilyContactsForPartner(user);
  }

  @Get('map-annotations')
  @UseGuards(JwtAuthGuard)
  async getMapAnnotationsForPartner(
    @CurrentUser() user: User,
    @Query('mapName') mapName?: string,
  ) {
    return this.partnerService.getMapAnnotationsForPartner(user, mapName);
  }
}

