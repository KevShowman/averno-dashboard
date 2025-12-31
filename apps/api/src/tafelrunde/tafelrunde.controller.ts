import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TafelrundeService } from './tafelrunde.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, TafelrundeStatus, TafelrundeAttendance } from '@prisma/client';

@Controller('tafelrunde')
@UseGuards(JwtAuthGuard)
export class TafelrundeController {
  constructor(private tafelrundeService: TafelrundeService) {}

  // ============ TAFELRUNDE CRUD ============

  @Get()
  async getAllTafelrunden(@CurrentUser() user: User) {
    return this.tafelrundeService.getAllTafelrunden(user);
  }

  @Get(':id')
  async getTafelrundeById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tafelrundeService.getTafelrundeById(user, id);
  }

  @Get(':id/summary')
  async getTafelrundeSummary(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tafelrundeService.getTafelrundeSummary(user, id);
  }

  @Post()
  async createTafelrunde(
    @CurrentUser() user: User,
    @Body() body: {
      title: string;
      description?: string;
      date: string;
      location?: string;
      meetingPointMapName: string;
      meetingPointX: number;
      meetingPointY: number;
      pickupStartTime?: string;
      arrivalDeadline?: string;
    },
  ) {
    return this.tafelrundeService.createTafelrunde(user, {
      ...body,
      date: new Date(body.date),
    });
  }

  @Put(':id')
  async updateTafelrunde(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      description?: string;
      date?: string;
      location?: string;
      meetingPointMapName?: string;
      meetingPointX?: number;
      meetingPointY?: number;
      pickupStartTime?: string;
      arrivalDeadline?: string;
      status?: TafelrundeStatus;
    },
  ) {
    return this.tafelrundeService.updateTafelrunde(user, id, {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
    });
  }

  @Delete(':id')
  async deleteTafelrunde(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tafelrundeService.deleteTafelrunde(user, id);
  }

  // ============ FAMILIEN MANAGEMENT ============

  @Post(':id/families')
  async addFamilyToTafelrunde(
    @CurrentUser() user: User,
    @Param('id') tafelrundeId: string,
    @Body() body: { familyContactId: string },
  ) {
    return this.tafelrundeService.addFamilyToTafelrunde(user, tafelrundeId, body.familyContactId);
  }

  @Post(':id/families/bulk')
  async addFamiliesToTafelrunde(
    @CurrentUser() user: User,
    @Param('id') tafelrundeId: string,
    @Body() body: { familyContactIds: string[] },
  ) {
    return this.tafelrundeService.addFamiliesToTafelrunde(user, tafelrundeId, body.familyContactIds);
  }

  @Delete(':id/families/:familyId')
  async removeFamilyFromTafelrunde(
    @CurrentUser() user: User,
    @Param('id') tafelrundeId: string,
    @Param('familyId') familyContactId: string,
  ) {
    return this.tafelrundeService.removeFamilyFromTafelrunde(user, tafelrundeId, familyContactId);
  }

  // ============ ANWESENHEIT ============

  @Put(':id/families/:familyId/attendance')
  async updateFamilyAttendance(
    @CurrentUser() user: User,
    @Param('id') tafelrundeId: string,
    @Param('familyId') familyContactId: string,
    @Body() body: {
      attendanceStatus: TafelrundeAttendance;
      note?: string;
    },
  ) {
    return this.tafelrundeService.updateFamilyAttendance(user, tafelrundeId, familyContactId, body);
  }

  // ============ BERECHTIGUNGEN ============

  @Get('permissions/list')
  async getAllPermissions(@CurrentUser() user: User) {
    return this.tafelrundeService.getAllPermissions(user);
  }

  @Get('permissions/check')
  async checkPermission(@CurrentUser() user: User) {
    const hasPermission = await this.tafelrundeService.checkPermission(user.id);
    return { hasPermission };
  }

  @Post('permissions/:userId')
  async grantPermission(
    @CurrentUser() user: User,
    @Param('userId') targetUserId: string,
  ) {
    return this.tafelrundeService.grantPermission(user, targetUserId);
  }

  @Delete('permissions/:userId')
  async revokePermission(
    @CurrentUser() user: User,
    @Param('userId') targetUserId: string,
  ) {
    return this.tafelrundeService.revokePermission(user, targetUserId);
  }
}


