import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
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

interface UpdateGenderDto {
  gender: 'MALE' | 'FEMALE';
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

  // Geschlecht aktualisieren (eigener User oder Leadership)
  @Patch('gender')
  async updateGender(
    @Body() updateDto: UpdateGenderDto,
    @Request() req
  ) {
    return this.usersService.updateGender(req.user.id, updateDto.gender);
  }

  // User-Rollen aktualisieren (nur Patron)
  @Put(':id/roles')
  @Roles(Role.PATRON, Role.ADMIN)
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

  // User löschen (nur Leaderschaft)
  @Delete(':id')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  @UseGuards(RolesGuard)
  async deleteUser(
    @Param('id') userId: string,
    @Request() req
  ) {
    return this.usersService.deleteUser(userId, req.user.id);
  }
}