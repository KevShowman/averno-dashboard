import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { OrganigrammService, RoleAssignmentDto } from './organigramm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('organigramm')
@UseGuards(JwtAuthGuard)
export class OrganigrammController {
  constructor(private readonly organigrammService: OrganigrammService) {}

  /**
   * Gibt alle Organigramm-Zuordnungen zurück (automatisch aus user.allRoles)
   */
  @Get('assignments')
  async getAllAssignments(): Promise<Record<string, RoleAssignmentDto[]>> {
    return this.organigrammService.getAllAssignments();
  }
}
