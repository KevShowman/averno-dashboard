import { Controller, Get, Patch, Body, Param, UseGuards, Post } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';

@Controller('discord')
@UseGuards(JwtAuthGuard)
export class DiscordController {
  constructor(private discordService: DiscordService) {}

  @Patch('sync-user-role')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SOLDADO)
  async syncUserRole(@CurrentUser() user: User) {
    try {
      const newRole = await this.discordService.syncUserRole(user.discordId);
      
      // Discord-Rollen aktualisieren
      const userDiscordRoles = await this.discordService.getUserRoles(user.discordId);
      await this.discordService.updateUserDiscordRoles(user.id, userDiscordRoles);

      return {
        message: 'Rolle erfolgreich synchronisiert',
        newRole,
        discordRoles: userDiscordRoles
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('user-roles')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SOLDADO)
  async getUserRoles(@CurrentUser() user: User) {
    try {
      const discordRoles = await this.discordService.getUserRoles(user.discordId);
      const validation = await this.discordService.validateUserAccess(user.discordId);
      
      return {
        discordId: user.discordId,
        discordRoles,
        hasAccess: validation.hasAccess,
        currentRole: user.role,
        reason: validation.reason
      };
    } catch (error) {
      return {
        error: 'Fehler beim Abrufen der Discord-Rollen',
        message: error.message
      };
    }
  }

  @Get('server-members')
  @Roles(Role.EL_PATRON, Role.DON)
  async getServerMembers() {
    try {
      const members = await this.discordService.getMembersWithAllowedRoles();
      return {
        message: 'Discord-Server-Mitglieder erfolgreich abgerufen',
        count: members.length,
        members
      };
    } catch (error) {
      return {
        error: 'Fehler beim Abrufen der Discord-Server-Mitglieder',
        message: error.message,
        members: []
      };
    }
  }

  @Post('import-member')
  @Roles(Role.EL_PATRON, Role.DON)
  async importMember(@Body('discordId') discordId: string) {
    try {
      const user = await this.discordService.importMemberToDatabase(discordId);
      return {
        message: 'Benutzer erfolgreich importiert',
        user: {
          id: user.id,
          discordId: user.discordId,
          username: user.username,
          role: user.role,
          discordRoles: user.discordRoles
        }
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('role-mappings')
  @Roles(Role.EL_PATRON, Role.DON)
  async getRoleMappings() {
    try {
      // Hier könnten wir die Rollen-Mappings aus der Datenbank abrufen
      // Für jetzt geben wir eine statische Liste zurück
      const roleMappings = [
        { discordRoleId: '1402760679613661224', systemRole: 'EL_PATRON', name: 'El Patron' },
        { discordRoleId: '1402760800216551494', systemRole: 'DON', name: 'Don' },
        { discordRoleId: '1402760888561438862', systemRole: 'ASESOR', name: 'Asesor' },
        { discordRoleId: '1402760961097470025', systemRole: 'ROUTENVERWALTUNG', name: 'Inspector' },
        { discordRoleId: '1402761049568051331', systemRole: 'ROUTENVERWALTUNG', name: 'Routenverwaltung' },
        { discordRoleId: '1402761676851511356', systemRole: 'SICARIO', name: 'Sicario' },
        { discordRoleId: '1402760263341707275', systemRole: 'SOLDADO', name: 'Soldado' }
      ];

      return {
        message: 'Rollen-Mappings erfolgreich abgerufen',
        mappings: roleMappings
      };
    } catch (error) {
      return {
        error: 'Fehler beim Abrufen der Rollen-Mappings',
        message: error.message
      };
    }
  }
}
