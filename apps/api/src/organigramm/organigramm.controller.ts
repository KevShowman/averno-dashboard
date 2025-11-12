import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrganigrammService, RoleAssignmentDto } from './organigramm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('organigramm')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganigrammController {
  constructor(private readonly organigrammService: OrganigrammService) {}

  @Get('assignments')
  async getAllAssignments(): Promise<Record<string, RoleAssignmentDto[]>> {
    return this.organigrammService.getAllAssignments();
  }

  @Post('assignments')
  @Roles(Role.EL_PATRON)
  async assignUserToRole(
    @Body() body: { roleId: string; userId: string },
  ): Promise<RoleAssignmentDto> {
    return this.organigrammService.assignUserToRole(body.roleId, body.userId);
  }

  @Delete('assignments/:roleId/:userId')
  @Roles(Role.EL_PATRON)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUserFromRole(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.organigrammService.removeUserFromRole(roleId, userId);
  }

  @Delete('assignments')
  @Roles(Role.EL_PATRON)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAllAssignments(): Promise<void> {
    await this.organigrammService.removeAllAssignments();
  }
}

