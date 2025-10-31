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
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SOLDADO, Role.LOGISTICA)
  async syncUserRole(@CurrentUser() user: User) {
    try {
      const newRole = await this.discordService.syncUserRole(user.discordId);
      
      // Discord-Rollen aktualisieren
      const userDiscordRoles = await this.discordService.getUserRoles(user.discordId);
      await this.discordService.updateUserDiscordRoles(user.id, userDiscordRoles);

      // Aktualisierten User mit allen Rollen abrufen
      const updatedUser = await this.discordService.getUserById(user.id);

      return {
        message: 'Rolle erfolgreich synchronisiert',
        newRole,
        allRoles: updatedUser?.allRoles || [],
        discordRoles: userDiscordRoles
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('user-roles')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SOLDADO, Role.LOGISTICA)
  async getUserRoles(@CurrentUser() user: User) {
    try {
      const discordRoles = await this.discordService.getUserRoles(user.discordId);
      const validation = await this.discordService.validateUserAccess(user.discordId);
      
      return {
        discordId: user.discordId,
        discordRoles,
        hasAccess: validation.hasAccess,
        currentRole: user.role,
        allRoles: user.allRoles || [],
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

  @Post('sync-all-members')
  @Roles(Role.EL_PATRON, Role.DON)
  async syncAllMembers() {
    try {
      const result = await this.discordService.syncAllMembersWithAllowedRoles();
      return {
        message: 'Alle Discord-Mitglieder erfolgreich synchronisiert',
        imported: result.imported,
        updated: result.updated,
        total: result.total
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('role-mappings')
  @Roles(Role.EL_PATRON, Role.DON)
  async getRoleMappings() {
    try {
      // Rollen-Mappings aus der Datenbank abrufen
      const roleMappings = await this.discordService.getRoleMappings();

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

  @Post('sync-and-remove-inactive')
  @Roles(Role.EL_PATRON, Role.DON)
  async syncUsersAndRemoveInactive() {
    return this.discordService.syncUsersAndRemoveInactive();
  }
}
