import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @Roles(Role.EL_PATRON, Role.DON)
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Patch('approval_threshold')
  @Roles(Role.EL_PATRON, Role.DON)
  async updateApprovalThreshold(
    @Body('amount') amount: number,
    @CurrentUser() user: User,
  ) {
    return this.settingsService.updateApprovalThreshold(amount, user.id);
  }
}
