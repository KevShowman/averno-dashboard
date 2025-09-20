import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.EL_PATRON, Role.DON)
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Patch(':id/role')
  @Roles(Role.EL_PATRON, Role.DON)
  async updateUserRole(
    @Param('id') userId: string,
    @Body('role') role: Role,
    @CurrentUser() user: User,
  ) {
    return this.usersService.updateUserRole(userId, role, user.id);
  }

  @Post('make-admin')
  @Roles(Role.EL_PATRON)
  async makeAdminByDiscordId(
    @Body('discordId') discordId: string,
    @CurrentUser() user: User,
  ) {
    return this.usersService.makeAdminByDiscordId(discordId, user.id);
  }

  @Patch('ic-name')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SICARIO, Role.SOLDADO)
  async updateIcName(
    @Body('icFirstName') icFirstName: string,
    @Body('icLastName') icLastName: string,
    @CurrentUser() user: User,
  ) {
    return this.usersService.updateIcName(user.id, icFirstName, icLastName);
  }
}
