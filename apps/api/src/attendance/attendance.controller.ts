import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Wochen-Übersicht abrufen
  @Get()
  async getWeekOverview(@Query('week') week?: string) {
    const weekString = week || this.attendanceService.getCurrentWeekString();
    return this.attendanceService.getWeekOverview(weekString);
  }

  // Prüfe eigene Berechtigung
  @Get('can-mark')
  async canMark(@CurrentUser() user: any) {
    const canMark = await this.attendanceService.canMarkAttendance(user);
    return { canMark };
  }

  // Statistiken abrufen
  @Get('stats')
  async getStats(@Query('weeks') weeks?: string) {
    const weeksNum = weeks ? parseInt(weeks) : 4;
    return this.attendanceService.getStats(weeksNum);
  }

  // Berechtigungen abrufen
  @Get('permissions')
  async getPermissions() {
    return this.attendanceService.getPermissions();
  }

  // Anwesenheit markieren
  @Post()
  async markAttendance(
    @CurrentUser() user: any,
    @Body() data: { userIds: string[]; date: string },
  ) {
    return this.attendanceService.markAttendance(user, data);
  }

  // Anwesenheit entfernen
  @Post('remove')
  async removeAttendance(
    @CurrentUser() user: any,
    @Body() data: { userIds: string[]; date: string },
  ) {
    return this.attendanceService.removeAttendance(user, data);
  }

  // Berechtigung erteilen
  @Post('permissions')
  async grantPermission(
    @CurrentUser() user: any,
    @Body() data: { userId: string },
  ) {
    return this.attendanceService.grantPermission(user, data.userId);
  }

  // Berechtigung entziehen
  @Delete('permissions/:userId')
  async revokePermission(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
  ) {
    return this.attendanceService.revokePermission(user, userId);
  }
}

