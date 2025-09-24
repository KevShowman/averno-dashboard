import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface UpdateUserRolesDto {
  allRoles: Role[];
}

interface UpdateIcNameDto {
  icFirstName: string;
  icLastName: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Alle User abrufen (alle authentifizierten User)
  @Get()
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  // User nach ID abrufen (alle authentifizierten User)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  // User suchen (alle authentifizierten User)
  @Get('search/:query')
  async searchUsers(@Param('query') query: string) {
    return this.usersService.searchUsers(query);
  }

  // Verfügbare Rollen abrufen (alle authentifizierten User)
  @Get('roles/available')
  async getAvailableRoles() {
    return this.usersService.getAvailableRoles();
  }

  // User-Statistiken abrufen (alle authentifizierten User)
  @Get('stats/overview')
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  // IC-Name aktualisieren (eigener User oder Leadership)
  @Patch('ic-name')
  async updateIcName(
    @Body() updateDto: UpdateIcNameDto,
    @Request() req
  ) {
    return this.usersService.updateIcName(
      req.user.id,
      updateDto.icFirstName,
      updateDto.icLastName
    );
  }

  // User-Rollen aktualisieren (nur El Patron)
  @Put(':id/roles')
  @Roles(Role.EL_PATRON)
  @UseGuards(RolesGuard)
  async updateUserRoles(
    @Param('id') userId: string,
    @Body() updateDto: UpdateUserRolesDto,
    @Request() req
  ) {
    return this.usersService.updateUserRoles(
      userId,
      updateDto.allRoles,
      req.user.id
    );
  }
}