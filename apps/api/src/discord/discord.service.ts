import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DiscordService {
  private readonly discordApiUrl = 'https://discord.com/api/v10';
  private readonly botToken: string;
  private readonly guildId: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.botToken = this.configService.get<string>('DISCORD_BOT_TOKEN');
    this.guildId = this.configService.get<string>('DISCORD_GUILD_ID');
    
    if (!this.botToken) {
      throw new Error('DISCORD_BOT_TOKEN ist nicht konfiguriert');
    }
    if (!this.guildId) {
      throw new Error('DISCORD_GUILD_ID ist nicht konfiguriert');
    }
  }

  async getUserRoles(discordId: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/members/${discordId}`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Benutzer ist nicht im Server
          return [];
        }
        throw new Error(`Discord API Fehler: ${response.status}`);
      }

      const member = await response.json();
      return member.roles || [];
    } catch (error) {
      console.error('Fehler beim Abrufen der Discord-Rollen:', error);
      return [];
    }
  }

  // Synchronisiere alle Discord-Mitglieder mit der Datenbank
  async syncDiscordMembers(): Promise<{ deleted: number; total: number }> {
    try {
      console.log('🔄 Starte Discord Member Sync...');

      // Hole alle Discord-Mitglieder
      const response = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/members?limit=1000`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Discord API Fehler: ${response.status}`);
      }

      const discordMembers = await response.json();
      const discordIds = new Set(discordMembers.map((m: any) => m.user.id));

      console.log(`📊 Discord Members: ${discordIds.size}`);

      // Hole alle User aus der DB
      const dbUsers = await this.prisma.user.findMany({
        select: {
          id: true,
          discordId: true,
          username: true,
          icFirstName: true,
          icLastName: true,
          isPartner: true,
          isTaxi: true,
        },
      });

      console.log(`📊 DB Users: ${dbUsers.length}`);

      // Finde User die nicht mehr im Discord sind (aber KEINE Partner oder Taxi-User - die müssen nicht im Server sein)
      const usersToDelete = dbUsers.filter(user => 
        !discordIds.has(user.discordId) && !user.isPartner && !user.isTaxi
      );

      console.log(`🗑️  User zum Löschen: ${usersToDelete.length} (Partner und Taxi-User werden übersprungen)`);

      // Lösche Ghost Users (mit CASCADE delete aller abhängigen Datensätze)
      let deletedCount = 0;
      for (const user of usersToDelete) {
        try {
          // Verwende Transaction um alle abhängigen Datensätze zu löschen
          await this.prisma.$transaction(async (tx) => {
            // Lösche alle abhängigen Datensätze in der richtigen Reihenfolge
            // 1. Abmeldungen
            await tx.abmeldung.deleteMany({ where: { userId: user.id } });
            
            // 2. Aufstellungen (Responses, Exclusions, dann Aufstellungen selbst)
            await tx.aufstellungResponse.deleteMany({ where: { userId: user.id } });
            await tx.aufstellungExclusion.deleteMany({ where: { userId: user.id } });
            await tx.aufstellungExclusion.deleteMany({ where: { createdById: user.id } });
            await tx.aufstellung.deleteMany({ where: { createdById: user.id } });
            
            // 3. Weekly Delivery (Exclusions, Archives, dann Deliveries)
            await tx.weeklyDeliveryExclusion.deleteMany({ where: { userId: user.id } });
            await tx.weeklyDeliveryExclusion.deleteMany({ where: { createdById: user.id } });
            await tx.weeklyDeliveryArchive.deleteMany({ where: { archivedById: user.id } });
            await tx.weeklyDelivery.deleteMany({ where: { userId: user.id } });
            await tx.weeklyDelivery.deleteMany({ where: { confirmedById: user.id } });
            
            // 4. Sanctions
            await tx.sanction.deleteMany({ where: { userId: user.id } });
            await tx.sanction.deleteMany({ where: { createdById: user.id } });
            
            // 5. Packages
            await tx.packageDeposit.deleteMany({ where: { userId: user.id } });
            await tx.packageDeposit.deleteMany({ where: { confirmedById: user.id } });
            await tx.packageDeposit.deleteMany({ where: { rejectedById: user.id } });
            
            // 6. Stock Movements
            await tx.stockMovement.deleteMany({ where: { createdById: user.id } });
            await tx.stockMovement.deleteMany({ where: { approvedById: user.id } });
            
            // 7. Money Transactions
            await tx.moneyTransaction.deleteMany({ where: { createdById: user.id } });
            await tx.moneyTransaction.deleteMany({ where: { approvedById: user.id } });
            
            // 8. Familiensammeln (Participations und Processors)
            await tx.familiensammelnParticipation.deleteMany({ where: { userId: user.id } });
            await tx.familiensammelnProcessor.deleteMany({ where: { userId: user.id } });
            await tx.familiensammelnProcessor.deleteMany({ where: { completedBy: user.id } });
            
            // 9. Organigramm Assignments
            await tx.organigrammAssignment.deleteMany({ where: { userId: user.id } });
            
            // 10. Member Files (Entries zuerst, dann File selbst)
            await tx.memberFileEntry.deleteMany({ where: { createdById: user.id } });
            await tx.memberFile.deleteMany({ where: { userId: user.id } });
            
            // 11. Sicario Aufstellungen (Responses zuerst, dann Aufstellungen)
            await tx.sicarioAufstellungResponse.deleteMany({ where: { userId: user.id } });
            await tx.sicarioAufstellung.deleteMany({ where: { createdById: user.id } });
            
            // 12. Daily Attendance - nur userId explizit löschen
            // markedById wird automatisch auf NULL gesetzt (onDelete: SetNull im Schema)
            await tx.dailyAttendance.deleteMany({ where: { userId: user.id } });
            
            // 13. Permissions - userId explizit löschen (onDelete: Cascade)
            // grantedById wird automatisch auf NULL gesetzt (onDelete: SetNull)
            await tx.attendancePermission.deleteMany({ where: { userId: user.id } });
            await tx.listPermission.deleteMany({ where: { userId: user.id } });
            await tx.mapPermission.deleteMany({ where: { userId: user.id } });
            
            // 14. Map Suggestions - werden automatisch gelöscht (onDelete: Cascade auf createdById)
            // MapAnnotation und MapArea createdById werden automatisch auf NULL gesetzt (onDelete: SetNull)
            // reviewedById wird automatisch auf NULL gesetzt (onDelete: SetNull)
            
            // 15. Family Contacts (outdatedMarkedById ist optional Foreign Key)
            await tx.familyContact.updateMany({ 
              where: { outdatedMarkedById: user.id },
              data: { outdatedMarkedById: null }
            });
            
            // 16. Action Logs (zuletzt, da diese Audit-Trail sind)
            await tx.actionLog.deleteMany({ where: { userId: user.id } });
            
            // 17. Jetzt den User löschen
            await tx.user.delete({ where: { id: user.id } });
          });
          
          const displayName = user.icFirstName && user.icLastName
            ? `${user.icFirstName} ${user.icLastName}`
            : user.username;
          
          console.log(`  ✅ Gelöscht: ${displayName} (${user.discordId})`);
          deletedCount++;
        } catch (error) {
          console.error(`  ❌ Fehler beim Löschen von ${user.username}:`, error.message);
        }
      }

      console.log(`✅ Sync abgeschlossen: ${deletedCount} von ${usersToDelete.length} Ghost Users gelöscht`);

      return {
        deleted: deletedCount,
        total: dbUsers.length,
      };
    } catch (error) {
      console.error('❌ Fehler beim Discord Member Sync:', error.message);
      return { deleted: 0, total: 0 };
    }
  }

  async validateUserAccess(discordId: string): Promise<{ hasAccess: boolean; highestRole?: Role; allRoles?: Role[]; reason?: string }> {
    try {
      // Discord-Rollen des Benutzers abrufen
      const userDiscordRoles = await this.getUserRoles(discordId);
      
      if (userDiscordRoles.length === 0) {
        return {
          hasAccess: false,
          reason: 'Benutzer ist nicht im Discord-Server oder hat keine Rollen'
        };
      }

      // Discord-Rollen-Mappings abrufen
      const roleMappings = await this.prisma.discordRoleMapping.findMany({
        where: { isActive: true }
      });

      // Prüfen ob der Benutzer mindestens eine erlaubte Rolle hat
      const validRoles = userDiscordRoles.filter(roleId => 
        roleMappings.some(mapping => mapping.discordRoleId === roleId)
      );

      if (validRoles.length === 0) {
        return {
          hasAccess: false,
          reason: 'Benutzer hat keine der erlaubten Discord-Rollen'
        };
      }

      // Alle System-Rollen des Users bestimmen
      const userRoleMappings = roleMappings.filter(mapping => 
        validRoles.includes(mapping.discordRoleId)
      );

      const allUserRoles = userRoleMappings.map(mapping => mapping.systemRole);

      // Rollen-Hierarchie definieren (höhere Zahlen = höhere Berechtigung)
      const roleHierarchy = {
        // Ränge 1-3
        [Role.EL_NOVATO]: 1,
        [Role.EL_PROTECTOR]: 2,
        [Role.EL_CONFIDENTE]: 3,
        // Ränge 4-6
        [Role.EL_PREFECTO]: 4,
        [Role.SOLDADO]: 5,
        [Role.EL_TENIENTE]: 6,
        // Ränge 7-9
        [Role.EL_ENCARGADO]: 7,
        [Role.EL_MENTOR]: 8,
        [Role.EL_CUSTODIO]: 9,
        // Leaderschaft
        [Role.EL_MANO_DERECHA]: 10,
        [Role.DON_COMANDANTE]: 11,
        [Role.DON_CAPITAN]: 12,
        [Role.EL_PATRON]: 13, // Höchste Rolle
        // Legacy/Spezialrollen
        [Role.SICARIO]: 5,
        [Role.ROUTENVERWALTUNG]: 6,
        [Role.LOGISTICA]: 5,
        [Role.FUTURO]: 1,
        [Role.ADMIN]: 13,
        [Role.QUARTIERMEISTER]: 5,
        [Role.MITGLIED]: 2,
        [Role.GAST]: 0,
      };

      const highestRole = userRoleMappings.reduce((highest, current) => {
        const currentLevel = roleHierarchy[current.systemRole];
        const highestLevel = roleHierarchy[highest.systemRole];
        return currentLevel > highestLevel ? current : highest;
      });

      return {
        hasAccess: true,
        highestRole: highestRole.systemRole,
        allRoles: allUserRoles
      };

    } catch (error) {
      console.error('Fehler bei der Benutzer-Zugriffsvalidierung:', error);
      return {
        hasAccess: false,
        reason: 'Fehler bei der Discord-Rollen-Überprüfung'
      };
    }
  }

  async syncUserRole(discordId: string): Promise<Role> {
    const validation = await this.validateUserAccess(discordId);
    
    if (!validation.hasAccess) {
      throw new BadRequestException(validation.reason || 'Zugriff verweigert');
    }

    // User in der Datenbank aktualisieren
    const user = await this.prisma.user.update({
      where: { discordId },
      data: { 
        role: validation.highestRole,
        allRoles: validation.allRoles || [validation.highestRole],
        discordRoles: await this.getUserRoles(discordId)
      }
    });

    return user.role;
  }

  async syncAllUserRoles(): Promise<{ total: number; updated: number; errors: number }> {
    try {
      // Hole alle User (außer Partner und Taxi-User - die haben eigene Rollen-Systeme)
      const users = await this.prisma.user.findMany({
        where: {
          isPartner: false,
          isTaxi: false,
        },
        select: {
          id: true,
          username: true,
          discordId: true,
          role: true,
          allRoles: true,
          discordRoles: true,
        }
      });

      // Hole alle aktiven Discord-Rollen-Mappings
      const roleMappings = await this.prisma.discordRoleMapping.findMany({
        where: { isActive: true }
      });

      let updatedCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Überspringe User ohne Discord-ID
          if (!user.discordId) {
            continue;
          }

          // WICHTIG: Hole Discord-Rollen DIREKT von Discord API (nicht aus DB!)
          const userDiscordRoleIds = await this.getUserRoles(user.discordId);

          if (userDiscordRoleIds.length === 0) {
            continue;
          }

          // Finde alle System-Rollen, die der User haben sollte
          const userRoleMappings = roleMappings.filter(mapping => 
            userDiscordRoleIds.includes(mapping.discordRoleId)
          );

          if (userRoleMappings.length === 0) {
            continue;
          }

          // Berechne alle System-Rollen
          const allSystemRoles = userRoleMappings.map(m => m.systemRole);

          // Finde die höchste Rolle basierend auf der Hierarchie
          const roleHierarchy = {
            [Role.EL_NOVATO]: 1,
            [Role.EL_PROTECTOR]: 2,
            [Role.EL_CONFIDENTE]: 3,
            [Role.EL_PREFECTO]: 4,
            [Role.SOLDADO]: 5,
            [Role.EL_TENIENTE]: 6,
            [Role.EL_ENCARGADO]: 7,
            [Role.EL_MENTOR]: 8,
            [Role.EL_CUSTODIO]: 9,
            [Role.EL_MANO_DERECHA]: 10,
            [Role.DON_COMANDANTE]: 11,
            [Role.DON_CAPITAN]: 12,
            [Role.EL_PATRON]: 13,
            [Role.SICARIO]: 5,
            [Role.ROUTENVERWALTUNG]: 6,
            [Role.LOGISTICA]: 5,
            [Role.FUTURO]: 1,
            [Role.ADMIN]: 13,
            [Role.QUARTIERMEISTER]: 5,
            [Role.MITGLIED]: 2,
            [Role.GAST]: 0,
            [Role.TAXI]: 1,
            [Role.TAXI_LEAD]: 2,
          };

          const highestRoleMapping = userRoleMappings.reduce((highest, current) => {
            const currentLevel = roleHierarchy[current.systemRole] || 0;
            const highestLevel = roleHierarchy[highest.systemRole] || 0;
            return currentLevel > highestLevel ? current : highest;
          });

          const newHighestRole = highestRoleMapping.systemRole;

          // Prüfe ob sich etwas geändert hat
          const currentAllRoles = Array.isArray(user.allRoles) 
            ? user.allRoles 
            : (typeof user.allRoles === 'string' ? JSON.parse(user.allRoles) : []);

          // Prüfe ob sich die System-Rollen geändert haben
          const rolesChanged = user.role !== newHighestRole || 
                              JSON.stringify(currentAllRoles.sort()) !== JSON.stringify(allSystemRoles.sort());

          // Prüfe ob sich die Discord-Rollen geändert haben
          const oldDiscordRoles = Array.isArray(user.discordRoles)
            ? user.discordRoles
            : (typeof user.discordRoles === 'string' ? JSON.parse(user.discordRoles) : []);
          const discordRolesChanged = JSON.stringify(oldDiscordRoles.sort()) !== JSON.stringify(userDiscordRoleIds.sort());

          if (rolesChanged || discordRolesChanged) {
            // Update User (inklusive Discord-Rollen aus API)
            await this.prisma.user.update({
              where: { id: user.id },
              data: {
                role: newHighestRole,
                allRoles: allSystemRoles,
                discordRoles: userDiscordRoleIds, // Speichere die frisch geholten Rollen
              }
            });

            updatedCount++;
          }

        } catch (error) {
          console.error(`Error syncing roles for ${user.username}:`, error.message);
          errorCount++;
        }
      }

      return {
        total: users.length,
        updated: updatedCount,
        errors: errorCount,
      };

    } catch (error) {
      console.error('Error in syncAllUserRoles:', error);
      return { total: 0, updated: 0, errors: 1 };
    }
  }

  async updateUserDiscordRoles(userId: string, discordRoles: string[]): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { discordRoles }
    });
  }

  async userHasRole(userId: string, requiredRole: Role): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { allRoles: true }
    });

    if (!user) {
      return false;
    }

    // JSON zu Array casten (MySQL verwendet Json statt native Arrays)
    const allRoles = Array.isArray(user.allRoles) ? user.allRoles : [];
    return allRoles.includes(requiredRole);
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, allRoles: true, discordRoles: true }
    });
  }

  async getAllServerMembers(): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/members?limit=1000`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Discord API Fehler: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler beim Abrufen der Server-Mitglieder:', error);
      return [];
    }
  }

  // Mitglieder OHNE Rollen holen (potentielle Blood In Kandidaten)
  async getMembersWithNoRoles(): Promise<any[]> {
    try {
      const allMembers = await this.getAllServerMembers();
      
      // Filtere: Keine Rollen (oder nur @everyone) UND kein Bot
      const membersWithNoRoles = allMembers.filter(member => {
        // Bots ausschließen
        if (member.user?.bot) return false;
        
        // Prüfen ob User keine Rollen hat (roles Array ist leer)
        // Discord gibt @everyone nicht im roles Array zurück
        const hasNoRoles = !member.roles || member.roles.length === 0;
        
        return hasNoRoles;
      });

      return membersWithNoRoles.map(member => ({
        discordId: member.user.id,
        username: member.nick || member.user.global_name || member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatar,
        joinedAt: member.joined_at,
      }));
    } catch (error) {
      console.error('Fehler beim Abrufen der Mitglieder ohne Rollen:', error);
      return [];
    }
  }

  async getMembersWithAllowedRoles(): Promise<any[]> {
    try {
      const allMembers = await this.getAllServerMembers();
      
      // Discord-Rollen-Mappings abrufen
      const roleMappings = await this.prisma.discordRoleMapping.findMany({
        where: { isActive: true }
      });

      const allowedRoleIds = roleMappings.map(mapping => mapping.discordRoleId);

      // Mitglieder filtern, die mindestens eine erlaubte Rolle haben
      const membersWithAllowedRoles = allMembers.filter(member => {
        return member.roles && member.roles.some((roleId: string) => 
          allowedRoleIds.includes(roleId)
        );
      });

      // Für jeden Mitglied die höchste Rolle bestimmen
      const membersWithRoles = membersWithAllowedRoles.map(member => {
        const memberRoleMappings = roleMappings.filter(mapping => 
          member.roles.includes(mapping.discordRoleId)
        );

        // Rollen-Hierarchie definieren
        const roleHierarchy = {
          [Role.SOLDADO]: 1,
          [Role.SICARIO]: 2,
          [Role.ROUTENVERWALTUNG]: 3,
          // REMOVED
          [Role.LOGISTICA]: 5,
          // REMOVED
          [Role.EL_PATRON]: 7,
        };

        const highestRole = memberRoleMappings.reduce((highest, current) => {
          const currentLevel = roleHierarchy[current.systemRole];
          const highestLevel = roleHierarchy[highest.systemRole];
          return currentLevel > highestLevel ? current : highest;
        });

        const allSystemRoles = memberRoleMappings.map(mapping => mapping.systemRole);

        return {
          discordId: member.user.id,
          username: member.user.username,
          discriminator: member.user.discriminator,
          avatar: member.user.avatar,
          discordRoles: member.roles,
          highestSystemRole: highestRole.systemRole,
          allSystemRoles: allSystemRoles,
          highestRoleName: highestRole.name,
          joinedAt: member.joined_at,
          isInDatabase: false // Wird später aktualisiert
        };
      });

      // Prüfen welche Mitglieder bereits in der Datenbank sind
      const discordIds = membersWithRoles.map(member => member.discordId);
      const existingUsers = await this.prisma.user.findMany({
        where: { discordId: { in: discordIds } }
      });

      const existingDiscordIds = new Set(existingUsers.map(user => user.discordId));

      return membersWithRoles.map(member => ({
        ...member,
        isInDatabase: existingDiscordIds.has(member.discordId)
      }));

    } catch (error) {
      console.error('Fehler beim Abrufen der Mitglieder mit erlaubten Rollen:', error);
      return [];
    }
  }

  async importDiscordMembers(): Promise<any> {
    try {
      // Alle Mitglieder mit erlaubten Rollen abrufen
      const members = await this.getMembersWithAllowedRoles();
      const importedUsers = [];
      const updatedUsers = [];
      
      for (const member of members) {
        try {
          // Prüfen ob User bereits in Datenbank existiert
          const existingUser = await this.prisma.user.findUnique({
            where: { discordId: member.discordId }
          });
          
          if (!existingUser) {
            // User importieren
            const importedUser = await this.importMemberToDatabase(member.discordId);
            importedUsers.push(importedUser);
          } else {
            // Bestehenden User mit aktuellen Nickname aktualisieren
            const updatedUser = await this.updateUserNickname(member.discordId, existingUser);
            if (updatedUser) {
              updatedUsers.push(updatedUser);
            }
          }
        } catch (error) {
          console.error(`Fehler beim Importieren/Aktualisieren von ${member.discordId}:`, error);
        }
      }
      
      return {
        message: `${importedUsers.length} neue Benutzer importiert, ${updatedUsers.length} aktualisiert`,
        imported: importedUsers.length,
        updated: updatedUsers.length,
        total: members.length
      };
    } catch (error) {
      console.error('Fehler beim Importieren aller Discord-Mitglieder:', error);
      throw error;
    }
  }

  async updateUserNickname(discordId: string, existingUser: any): Promise<any> {
    try {
      // Server-spezifische Mitgliedsdaten abrufen (für Nickname)
      const memberResponse = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/members/${discordId}`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!memberResponse.ok) {
        return null; // User nicht mehr im Server
      }
      
      const memberData = await memberResponse.json();
      const serverNickname = memberData.nick || memberData.user?.display_name || memberData.user?.username;
      
      // Nur aktualisieren wenn sich der Name geändert hat
      if (serverNickname !== existingUser.username) {
        const updatedUser = await this.prisma.user.update({
          where: { discordId },
          data: { username: serverNickname },
        });
        return updatedUser;
      }
      
      return null; // Keine Änderung nötig
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Nicknames:', error);
      return null;
    }
  }

  async importMemberToDatabase(discordId: string): Promise<any> {
    try {
      // Discord-Benutzer-Informationen abrufen
      const userResponse = await fetch(
        `${this.discordApiUrl}/users/${discordId}`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!userResponse.ok) {
        throw new Error(`Discord API Fehler: ${userResponse.status}`);
      }

      const discordUser = await userResponse.json();
      
      // Discord-Rollen des Benutzers abrufen
      const userDiscordRoles = await this.getUserRoles(discordId);
      
      // Server-spezifische Mitgliedsdaten abrufen (für Nickname)
      const memberResponse = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/members/${discordId}`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      let serverNickname = discordUser.username; // Fallback
      if (memberResponse.ok) {
        const memberData = await memberResponse.json();
        serverNickname = memberData.nick || memberData.user?.display_name || discordUser.username;
      }
      
      // Zugriff validieren
      const validation = await this.validateUserAccess(discordId);
      
      if (!validation.hasAccess) {
        throw new BadRequestException('Benutzer hat keine erlaubten Discord-Rollen');
      }

      // Benutzer in Datenbank erstellen
      const user = await this.prisma.user.create({
        data: {
          discordId,
          username: serverNickname, // Verwende Server-Nickname anstatt Discord-Username
          avatarUrl: discordUser.avatar ? 
            `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : null,
          email: null, // Discord Bot kann keine E-Mail abrufen
          role: validation.highestRole!,
          allRoles: validation.allRoles || [validation.highestRole!],
          discordRoles: userDiscordRoles,
        },
      });

      return user;
    } catch (error) {
      console.error('Fehler beim Importieren des Benutzers:', error);
      throw error;
    }
  }

  // Spezielle Import-Methode für Blood In - ohne Rollen-Prüfung
  async importMemberToDatabaseForBloodIn(discordId: string): Promise<any> {
    try {
      // Discord-Benutzerdaten abrufen
      const userResponse = await fetch(
        `${this.discordApiUrl}/users/${discordId}`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!userResponse.ok) {
        throw new Error(`Discord API Fehler: ${userResponse.status}`);
      }

      const discordUser = await userResponse.json();
      
      // Discord-Rollen des Benutzers abrufen
      const userDiscordRoles = await this.getUserRoles(discordId);
      
      // Server-spezifische Mitgliedsdaten abrufen (für Nickname)
      const memberResponse = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/members/${discordId}`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      let serverNickname = discordUser.username;
      if (memberResponse.ok) {
        const memberData = await memberResponse.json();
        serverNickname = memberData.nick || memberData.user?.display_name || discordUser.username;
      }
      
      // Versuche Rollen zu validieren, aber verwende FUTURO als Fallback
      const validation = await this.validateUserAccess(discordId);
      const role = validation.hasAccess ? validation.highestRole : 'FUTURO';
      const allRoles = validation.hasAccess ? (validation.allRoles || [role]) : ['FUTURO'];

      // Benutzer in Datenbank erstellen
      const user = await this.prisma.user.create({
        data: {
          discordId,
          username: serverNickname,
          avatarUrl: discordUser.avatar ? 
            `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : null,
          email: null,
          role: role as any,
          allRoles: allRoles as any[],
          discordRoles: userDiscordRoles,
        },
      });

      return user;
    } catch (error) {
      console.error('Fehler beim Importieren des Benutzers für Blood In:', error);
      throw error;
    }
  }

  async syncAllMembersWithAllowedRoles() {
    try {
      const members = await this.getMembersWithAllowedRoles();
      let imported = 0;
      let updated = 0;
      const errors = [];

      for (const member of members) {
        try {
          const existingUser = await this.prisma.user.findUnique({
            where: { discordId: member.discordId }
          });

          if (existingUser) {
            // Aktualisiere bestehenden Benutzer
            await this.prisma.user.update({
              where: { discordId: member.discordId },
              data: {
                username: member.username,
                role: member.highestSystemRole,
                allRoles: member.allSystemRoles || [member.highestSystemRole],
                discordRoles: member.discordRoles,
              }
            });
            updated++;
          } else {
            // Erstelle neuen Benutzer
            await this.prisma.user.create({
              data: {
                discordId: member.discordId,
                username: member.username,
                avatarUrl: member.avatar ? 
                  `https://cdn.discordapp.com/avatars/${member.discordId}/${member.avatar}.png` : 
                  null,
                email: null,
                role: member.highestSystemRole,
                allRoles: member.allSystemRoles || [member.highestSystemRole],
                discordRoles: member.discordRoles,
              }
            });
            imported++;
          }
        } catch (error) {
          console.error(`Fehler beim Synchronisieren von ${member.username}:`, error);
          errors.push({ username: member.username, error: error.message });
        }
      }

      return {
        imported,
        updated,
        total: members.length,
        errors
      };
    } catch (error) {
      console.error('Fehler beim Synchronisieren aller Mitglieder:', error);
      throw error;
    }
  }

  // Rollen-Mappings aus der Datenbank abrufen
  async getRoleMappings() {
    try {
      const mappings = await this.prisma.discordRoleMapping.findMany({
        where: { isActive: true },
        select: {
          discordRoleId: true,
          systemRole: true,
          name: true,
        }
      });

      return mappings.map(mapping => ({
        discordRoleId: mapping.discordRoleId,
        systemRole: mapping.systemRole,
        name: mapping.name,
      }));
    } catch (error) {
      console.error('Fehler beim Abrufen der Rollen-Mappings:', error);
      throw error;
    }
  }

  // Discord DM senden
  async sendDirectMessage(discordId: string, content: string): Promise<boolean> {
    try {
      // Erst einen DM-Channel mit dem User erstellen
      const dmChannelResponse = await fetch(
        `${this.discordApiUrl}/users/@me/channels`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient_id: discordId,
          }),
        }
      );

      if (!dmChannelResponse.ok) {
        console.error(`Fehler beim Erstellen des DM-Channels: ${dmChannelResponse.status}`);
        return false;
      }

      const dmChannel = await dmChannelResponse.json();

      // Nachricht in den DM-Channel senden
      const messageResponse = await fetch(
        `${this.discordApiUrl}/channels/${dmChannel.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
          }),
        }
      );

      if (!messageResponse.ok) {
        console.error(`Fehler beim Senden der DM: ${messageResponse.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Discord DM:', error);
      return false;
    }
  }

  // Discord Embed DM senden
  async sendEmbedDirectMessage(discordId: string, embed: {
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text: string; icon_url?: string };
    timestamp?: string;
    url?: string;
  }): Promise<boolean> {
    try {
      // Erst einen DM-Channel mit dem User erstellen
      const dmChannelResponse = await fetch(
        `${this.discordApiUrl}/users/@me/channels`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient_id: discordId,
          }),
        }
      );

      if (!dmChannelResponse.ok) {
        console.error(`Fehler beim Erstellen des DM-Channels: ${dmChannelResponse.status}`);
        return false;
      }

      const dmChannel = await dmChannelResponse.json();

      // Embed-Nachricht in den DM-Channel senden
      const messageResponse = await fetch(
        `${this.discordApiUrl}/channels/${dmChannel.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            embeds: [embed],
          }),
        }
      );

      if (!messageResponse.ok) {
        console.error(`Fehler beim Senden der Embed DM: ${messageResponse.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Discord Embed DM:', error);
      return false;
    }
  }

  // Prüfen ob ein Discord User noch im Server ist
  async isUserInServer(discordId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/members/${discordId}`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // User vom Server kicken
  async kickUser(discordId: string, reason?: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/members/${discordId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
            'X-Audit-Log-Reason': reason || 'Blood Out',
          },
        }
      );

      if (!response.ok) {
        console.error(`Fehler beim Kicken des Users: ${response.status}`);
        return false;
      }

      console.log(`User ${discordId} wurde vom Server gekickt. Grund: ${reason || 'Blood Out'}`);
      return true;
    } catch (error) {
      console.error('Fehler beim Kicken des Users:', error);
      return false;
    }
  }

  // Nachricht in einen Channel senden
  async sendChannelMessage(channelId: string, content: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.discordApiUrl}/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) {
        console.error(`Fehler beim Senden der Channel-Nachricht: ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Channel-Nachricht:', error);
      return false;
    }
  }

  // Embed-Nachricht in einen Channel senden
  async sendChannelEmbed(channelId: string, embed: {
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text: string; icon_url?: string };
    timestamp?: string;
    thumbnail?: { url: string };
    image?: { url: string };
  }): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.discordApiUrl}/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ embeds: [embed] }),
        }
      );

      if (!response.ok) {
        console.error(`Fehler beim Senden des Channel-Embeds: ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Fehler beim Senden des Channel-Embeds:', error);
      return false;
    }
  }

  // Alle Text-Channels des Servers abrufen
  async getServerChannels(): Promise<Array<{ id: string; name: string; type: number; parentId?: string; parentName?: string }>> {
    try {
      const response = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/channels`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Fehler beim Abrufen der Channels: ${response.status}`);
        return [];
      }

      const channels = await response.json();
      
      // Kategorien (type 4) für Parent-Namen
      const categories = channels.filter((c: any) => c.type === 4);
      const categoryMap = new Map(categories.map((c: any) => [c.id, c.name]));

      // Nur Text-Channels (type 0) und News-Channels (type 5) zurückgeben
      const textChannels = channels
        .filter((c: any) => c.type === 0 || c.type === 5)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          parentId: c.parent_id,
          parentName: c.parent_id ? categoryMap.get(c.parent_id) : undefined,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return textChannels;
    } catch (error) {
      console.error('Fehler beim Abrufen der Server-Channels:', error);
      return [];
    }
  }

  // Discord Rolle zu einem User hinzufügen
  async addRoleToUser(discordId: string, roleId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/members/${discordId}/roles/${roleId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Fehler beim Hinzufügen der Rolle ${roleId} zu User ${discordId}: ${response.status}`);
        return false;
      }

      console.log(`Rolle ${roleId} zu User ${discordId} hinzugefügt`);
      return true;
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Discord Rolle:', error);
      return false;
    }
  }

  // Mehrere Discord Rollen zu einem User hinzufügen
  async addRolesToUser(discordId: string, roleIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const roleId of roleIds) {
      const added = await this.addRoleToUser(discordId, roleId);
      if (added) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  // Alle Discord Rollen des Servers abrufen
  async getServerRoles(): Promise<Array<{ id: string; name: string; color: number; position: number }>> {
    try {
      const response = await fetch(
        `${this.discordApiUrl}/guilds/${this.guildId}/roles`,
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Fehler beim Abrufen der Rollen: ${response.status}`);
        return [];
      }

      const roles = await response.json();
      
      // Sortiere nach Position (höhere = wichtiger)
      return roles
        .filter((r: any) => r.name !== '@everyone')
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          color: r.color,
          position: r.position,
        }))
        .sort((a: any, b: any) => b.position - a.position);
    } catch (error) {
      console.error('Fehler beim Abrufen der Server-Rollen:', error);
      return [];
    }
  }

  // Synchronisiert User mit Discord und entfernt User die nicht mehr im Server sind
  async syncUsersAndRemoveInactive() {
    try {
      console.log('Starte Discord-User-Synchronisierung...');
      
      // Alle Discord-Mitglieder mit erlaubten Rollen abrufen
      const discordMembers = await this.getMembersWithAllowedRoles();
      const discordMemberIds = new Set(discordMembers.map(m => m.discordId));
      
      // Alle User in der Datenbank abrufen
      const allDbUsers = await this.prisma.user.findMany({
        select: {
          id: true,
          discordId: true,
          username: true,
          role: true,
          isPartner: true,
        }
      });
      
      // User die nicht mehr im Discord sind (aber KEINE Partner - die müssen nicht im Server sein)
      const usersToRemove = allDbUsers.filter(user => 
        !discordMemberIds.has(user.discordId) && !user.isPartner
      );
      
      let removedCount = 0;
      const removedUsers = [];
      
      for (const user of usersToRemove) {
        try {
          // Lösche den User aus der Datenbank
          await this.prisma.user.delete({
            where: { id: user.id }
          });
          
          removedCount++;
          removedUsers.push({
            id: user.id,
            username: user.username,
            discordId: user.discordId
          });
          
          console.log(`✓ User entfernt: ${user.username} (Discord-ID: ${user.discordId})`);
        } catch (error) {
          console.error(`Fehler beim Entfernen von User ${user.username}:`, error);
        }
      }
      
      // Synchronisiere verbleibende User
      const syncResult = await this.syncAllMembersWithAllowedRoles();
      
      console.log(`Discord-Synchronisierung abgeschlossen:
        - ${removedCount} User entfernt (nicht mehr im Discord)
        - ${syncResult.imported} neue User importiert
        - ${syncResult.updated} User aktualisiert
        - ${discordMemberIds.size} User im Discord gefunden`);
      
      return {
        removed: removedCount,
        removedUsers,
        imported: syncResult.imported,
        updated: syncResult.updated,
        totalDiscordMembers: discordMemberIds.size,
        errors: syncResult.errors
      };
    } catch (error) {
      console.error('Fehler bei der Discord-User-Synchronisierung:', error);
      throw error;
    }
  }

  // Partner-Anfrage Benachrichtigung an Leadership senden
  async sendPartnerRequestNotification(
    username: string, 
    familyName: string, 
    reason: string, 
    isReRequest: boolean = false
  ): Promise<void> {
    try {
      const webhookUrl = this.configService.get<string>('DISCORD_PARTNER_WEBHOOK_URL');
      
      if (!webhookUrl) {
        console.warn('DISCORD_PARTNER_WEBHOOK_URL nicht konfiguriert - keine Benachrichtigung gesendet');
        return;
      }

      const embed = {
        title: isReRequest ? '🔄 Neue Partner-Anfrage (erneut)' : '📨 Neue Partner-Zugangsanfrage',
        color: isReRequest ? 0xFFA500 : 0x5865F2, // Orange für Re-Request, Discord Blau für neu
        fields: [
          {
            name: 'Discord Benutzer',
            value: username,
            inline: true,
          },
          {
            name: 'Familie',
            value: familyName,
            inline: true,
          },
          {
            name: 'Begründung',
            value: reason.substring(0, 1000) || 'Keine Begründung angegeben',
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'LSC Partner-System',
        },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      console.log(`✅ Partner-Anfrage Benachrichtigung gesendet für ${username}`);
    } catch (error) {
      console.error('Fehler beim Senden der Partner-Anfrage Benachrichtigung:', error);
    }
  }

  // Partner-Vorschlag Benachrichtigung (für neue Familien-Vorschläge von Partnern)
  async sendPartnerSuggestionNotification(
    partnerUsername: string,
    suggestionType: 'CREATE' | 'UPDATE' | 'DELETE',
    familyName: string,
    hasMapData: boolean,
    isKeyFamily: boolean,
    isOutdated: boolean,
  ): Promise<void> {
    try {
      const webhookUrl = this.configService.get<string>('DISCORD_PARTNER_WEBHOOK_URL');
      
      if (!webhookUrl) {
        console.warn('DISCORD_PARTNER_WEBHOOK_URL nicht konfiguriert - keine Benachrichtigung gesendet');
        return;
      }

      const typeLabels: Record<string, { emoji: string; label: string; color: number }> = {
        CREATE: { emoji: '📝', label: 'Neuer Familien-Eintrag', color: 0x22C55E }, // Grün
        UPDATE: { emoji: '✏️', label: 'Familien-Aktualisierung', color: 0x3B82F6 }, // Blau
        DELETE: { emoji: '🗑️', label: 'Familien-Löschung', color: 0xEF4444 }, // Rot
      };

      const typeConfig = typeLabels[suggestionType] || typeLabels.CREATE;

      const flags: string[] = [];
      if (isKeyFamily) flags.push('🔑 Schlüsselfamilie');
      if (isOutdated) flags.push('⚠️ Veraltet');
      if (hasMapData) flags.push('📍 Mit Karten-Standort');

      const embed = {
        title: `${typeConfig.emoji} Partner-Vorschlag: ${typeConfig.label}`,
        color: typeConfig.color,
        fields: [
          {
            name: 'Partner',
            value: partnerUsername,
            inline: true,
          },
          {
            name: 'Familie',
            value: familyName,
            inline: true,
          },
          ...(flags.length > 0 ? [{
            name: 'Flags',
            value: flags.join(' | '),
            inline: false,
          }] : []),
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'LSC Partner-System • Vorschlag wartet auf Prüfung',
        },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      console.log(`✅ Partner-Vorschlag Benachrichtigung gesendet: ${suggestionType} für ${familyName}`);
    } catch (error) {
      console.error('Fehler beim Senden der Partner-Vorschlag Benachrichtigung:', error);
    }
  }

  // ============ TAXI-SYSTEM WEBHOOKS ============

  // Neuer Taxi-Key erstellt
  async sendTaxiKeyCreatedNotification(
    creatorUsername: string,
    keyType: string,
    isMasterKey: boolean,
    note?: string
  ): Promise<void> {
    try {
      const webhookUrl = this.configService.get<string>('DISCORD_PARTNER_WEBHOOK_URL');
      if (!webhookUrl) return;

      const embed = {
        title: '🔑 Neuer Taxi-Zugangsschlüssel erstellt',
        color: isMasterKey ? 0x9333EA : 0xEAB308, // Purple für Master, Gelb für normal
        fields: [
          { name: 'Erstellt von', value: creatorUsername, inline: true },
          { name: 'Typ', value: keyType, inline: true },
          { name: 'Leitungsebene', value: isMasterKey ? '✅ Ja (Master Key)' : '❌ Nein', inline: true },
          ...(note ? [{ name: 'Notiz', value: note, inline: false }] : []),
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'LSC Taxi-System' },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      console.error('Fehler beim Senden der Taxi-Key Benachrichtigung:', error);
    }
  }

  // Neuer Taxi-Fahrer registriert
  async sendTaxiDriverRegisteredNotification(
    driverUsername: string,
    isTaxiLead: boolean
  ): Promise<void> {
    try {
      const webhookUrl = this.configService.get<string>('DISCORD_PARTNER_WEBHOOK_URL');
      if (!webhookUrl) return;

      const embed = {
        title: isTaxiLead ? '👑 Neue Taxi-Leitung registriert' : '🚕 Neuer Taxi-Fahrer registriert',
        color: isTaxiLead ? 0x9333EA : 0x22C55E,
        fields: [
          { name: 'Benutzer', value: driverUsername, inline: true },
          { name: 'Rolle', value: isTaxiLead ? 'Taxi-Leitung' : 'Taxi-Fahrer', inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'LSC Taxi-System' },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      console.error('Fehler beim Senden der Taxi-Registrierung Benachrichtigung:', error);
    }
  }

  // Fahrer zu Familie zugewiesen
  async sendTaxiAssignmentNotification(
    familyName: string,
    driverUsername: string,
    tafelrundeTitle: string,
    assignedByUsername: string
  ): Promise<void> {
    try {
      const webhookUrl = this.configService.get<string>('DISCORD_PARTNER_WEBHOOK_URL');
      if (!webhookUrl) return;

      const embed = {
        title: '🚗 Taxi-Zuweisung',
        color: 0xEAB308,
        fields: [
          { name: 'Familie', value: familyName, inline: true },
          { name: 'Fahrer', value: driverUsername, inline: true },
          { name: 'Tafelrunde', value: tafelrundeTitle, inline: false },
          { name: 'Zugewiesen von', value: assignedByUsername, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'LSC Taxi-System' },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      console.error('Fehler beim Senden der Taxi-Zuweisung Benachrichtigung:', error);
    }
  }

  // Taxi-Status geändert
  async sendTaxiStatusChangeNotification(
    familyName: string,
    driverUsername: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      const webhookUrl = this.configService.get<string>('DISCORD_PARTNER_WEBHOOK_URL');
      if (!webhookUrl) return;

      const statusLabels: Record<string, string> = {
        PENDING: '⏳ Ausstehend',
        ASSIGNED: '📋 Zugewiesen',
        EN_ROUTE: '🚗 Unterwegs',
        PICKED_UP: '✅ Abgeholt',
        DELIVERED: '🏁 Abgeliefert',
        CANCELLED: '❌ Abgesagt',
      };

      const statusColors: Record<string, number> = {
        PENDING: 0x6B7280,
        ASSIGNED: 0xEAB308,
        EN_ROUTE: 0xEA580C,
        PICKED_UP: 0xA855F7,
        DELIVERED: 0x22C55E,
        CANCELLED: 0xEF4444,
      };

      const embed = {
        title: '🚕 Taxi-Status aktualisiert',
        color: statusColors[newStatus] || 0x6B7280,
        fields: [
          { name: 'Familie', value: familyName, inline: true },
          { name: 'Fahrer', value: driverUsername, inline: true },
          { name: 'Status', value: `${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`, inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'LSC Taxi-System' },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      console.error('Fehler beim Senden der Taxi-Status Benachrichtigung:', error);
    }
  }

  // ============ TAFELRUNDE-SYSTEM WEBHOOKS ============

  // Neue Tafelrunde erstellt
  async sendTafelrundeCreatedNotification(
    title: string,
    date: Date,
    time: string,
    creatorUsername: string,
    familyCount: number
  ): Promise<void> {
    try {
      const webhookUrl = this.configService.get<string>('DISCORD_PARTNER_WEBHOOK_URL');
      if (!webhookUrl) return;

      const dateStr = date.toLocaleDateString('de-DE', { 
        weekday: 'long', 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });

      const embed = {
        title: '🍽️ Neue Tafelrunde erstellt',
        color: 0xF59E0B,
        fields: [
          { name: 'Titel', value: title, inline: false },
          { name: 'Datum', value: dateStr, inline: true },
          { name: 'Uhrzeit', value: time, inline: true },
          { name: 'Familien', value: `${familyCount} eingeladen`, inline: true },
          { name: 'Erstellt von', value: creatorUsername, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'LSC Tafelrunde-System' },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      console.error('Fehler beim Senden der Tafelrunde Benachrichtigung:', error);
    }
  }

  // Anwesenheitsstatus geändert
  async sendTafelrundeAttendanceNotification(
    tafelrundeTitle: string,
    familyName: string,
    attendance: string,
    updatedByUsername: string
  ): Promise<void> {
    try {
      const webhookUrl = this.configService.get<string>('DISCORD_PARTNER_WEBHOOK_URL');
      if (!webhookUrl) return;

      const attendanceLabels: Record<string, string> = {
        ATTENDING: '✅ Kommt',
        NOT_ATTENDING: '❌ Kommt nicht',
        MAYBE: '❓ Vielleicht',
        UNKNOWN: '⏳ Unbekannt',
      };

      const attendanceColors: Record<string, number> = {
        ATTENDING: 0x22C55E,
        NOT_ATTENDING: 0xEF4444,
        MAYBE: 0xEAB308,
        UNKNOWN: 0x6B7280,
      };

      const embed = {
        title: '📋 Tafelrunde-Rückmeldung',
        color: attendanceColors[attendance] || 0x6B7280,
        fields: [
          { name: 'Tafelrunde', value: tafelrundeTitle, inline: false },
          { name: 'Familie', value: familyName, inline: true },
          { name: 'Status', value: attendanceLabels[attendance] || attendance, inline: true },
          { name: 'Aktualisiert von', value: updatedByUsername, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'LSC Tafelrunde-System' },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      console.error('Fehler beim Senden der Tafelrunde-Rückmeldung Benachrichtigung:', error);
    }
  }
}
