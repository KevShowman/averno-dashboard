import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { TaxiService } from './taxi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, TaxiKeyType, TaxiAssignmentStatus } from '@prisma/client';

@Controller('taxi')
export class TaxiController {
  constructor(private readonly taxiService: TaxiService) {}

  // ============ KEY MANAGEMENT ============

  @Post('keys')
  @UseGuards(JwtAuthGuard)
  async generateKey(
    @CurrentUser() user: User,
    @Body() body: {
      isMasterKey?: boolean;
      type?: TaxiKeyType;
      expiresAt?: string;
      note?: string;
    },
  ) {
    return this.taxiService.generateKey(user, {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Get('keys')
  @UseGuards(JwtAuthGuard)
  async getAllKeys(@CurrentUser() user: User) {
    return this.taxiService.getAllKeys(user);
  }

  @Post('keys/:id/revoke')
  @UseGuards(JwtAuthGuard)
  async revokeKey(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.taxiService.revokeKey(user, id);
  }

  @Post('keys/validate')
  @UseGuards(JwtAuthGuard)
  async validateKey(
    @CurrentUser() user: User,
    @Body() body: { key: string },
  ) {
    return this.taxiService.validateAndUseKey(user, body.key);
  }

  @Post('keys/validate-new')
  async validateKeyForNewUser(
    @Body() body: { 
      key: string;
      discordId: string;
      username: string;
      avatarUrl?: string;
      email?: string;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.taxiService.validateAndCreateTaxiUser(body.key, {
      discordId: body.discordId,
      username: body.username,
      avatarUrl: body.avatarUrl,
      email: body.email,
    });

    // Wenn erfolgreich, setze Tokens als HTTP-only Cookies
    if (result.valid && result.accessToken && result.refreshToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    // Tokens nicht im Response-Body zurückgeben (Sicherheit)
    return {
      valid: result.valid,
      isMasterKey: result.isMasterKey,
      message: result.message,
    };
  }

  // ============ DRIVERS ============

  @Get('drivers')
  @UseGuards(JwtAuthGuard)
  async getAllDrivers(@CurrentUser() user: User) {
    return this.taxiService.getAllDrivers(user);
  }

  // ============ TAFELRUNDEN & ASSIGNMENTS ============

  @Get('tafelrunden')
  @UseGuards(JwtAuthGuard)
  async getActiveTafelrunden(@CurrentUser() user: User) {
    return this.taxiService.getActiveTafelrundenForTaxi(user);
  }

  @Get('tafelrunden/:id')
  @UseGuards(JwtAuthGuard)
  async getTafelrundeDetails(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.taxiService.getAttendingFamiliesForTafelrunde(user, id);
  }

  @Post('assignments')
  @UseGuards(JwtAuthGuard)
  async assignDriver(
    @CurrentUser() user: User,
    @Body() body: {
      tafelrundeId: string;
      familyContactId: string;
      driverId?: string;
      pickupNotes?: string;
      pickupTime?: string;
    },
  ) {
    return this.taxiService.assignDriver(user, body);
  }

  @Patch('assignments/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateAssignmentStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { status: TaxiAssignmentStatus },
  ) {
    return this.taxiService.updateAssignmentStatus(user, id, body.status);
  }

  @Patch('assignments/:id')
  @UseGuards(JwtAuthGuard)
  async updateAssignment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: {
      driverId?: string | null;
      pickupNotes?: string;
      pickupTime?: string;
    },
  ) {
    return this.taxiService.updateAssignment(user, id, body);
  }

  @Delete('assignments/:id')
  @UseGuards(JwtAuthGuard)
  async removeAssignment(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.taxiService.removeAssignment(user, id);
  }

  @Get('my-assignments')
  @UseGuards(JwtAuthGuard)
  async getMyAssignments(
    @CurrentUser() user: User,
    @Query('tafelrundeId') tafelrundeId?: string,
  ) {
    return this.taxiService.getMyAssignments(user, tafelrundeId);
  }

  // ============ PERMISSION CHECK ============

  @Get('can-manage')
  @UseGuards(JwtAuthGuard)
  async canManage(@CurrentUser() user: User) {
    const LEADERSHIP_ROLES = ['PATRON', 'DON', 'CAPO', 'ADMIN'];
    const isLeadership = LEADERSHIP_ROLES.includes(user.role);
    
    return {
      canCreateKeys: await this.taxiService.canCreateKeys(user),
      canManageAssignments: await this.taxiService.canManageAssignments(user),
      isTaxi: user.isTaxi,
      isTaxiLead: user.isTaxiLead || isLeadership,
      isLeadership,
    };
  }
}

