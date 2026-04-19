import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ModulesService } from './modules.service';

@Controller('modules')
@UseGuards(JwtAuthGuard)
export class ModulesController {
  constructor(private modulesService: ModulesService) {}

  @Get()
  async getModules() {
    return this.modulesService.getEnabledModules();
  }

  @Get('all')
  @Roles(Role.PATRON)
  @UseGuards(RolesGuard)
  async getAllModules() {
    return this.modulesService.getAllModules();
  }

  @Patch(':key/toggle')
  @Roles(Role.PATRON)
  @UseGuards(RolesGuard)
  async toggleModule(
    @Param('key') key: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.modulesService.toggleModule(key, enabled);
  }
}
