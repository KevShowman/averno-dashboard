import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User, FileEntryType } from '@prisma/client';
import { MemberFilesService } from './member-files.service';

interface CreateFileEntryDto {
  type: FileEntryType;
  content: string;
}

interface UpdateUprankDto {
  lastUprankDate: string; // ISO string
}

@Controller('member-files')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EL_PATRON, Role.DON_CAPITAN, Role.DON_COMANDANTE, Role.EL_MANO_DERECHA)
export class MemberFilesController {
  constructor(private memberFilesService: MemberFilesService) {}

  // Alle aktiven Akten abrufen
  @Get()
  async getAllFiles(@Query('includeArchived') includeArchived?: string) {
    const includeArchivedBool = includeArchived === 'true';
    return this.memberFilesService.getAllFiles(includeArchivedBool);
  }

  // User mit längster Zeit ohne Uprank abrufen
  @Get('uprank-pending')
  async getUsersPendingUprank() {
    return this.memberFilesService.getUsersPendingUprank();
  }

  // Akte eines Users abrufen
  @Get(':userId')
  async getFileByUserId(@Param('userId') userId: string) {
    return this.memberFilesService.getFileByUserId(userId);
  }

  // Eintrag zur Akte hinzufügen
  @Post(':userId/entries')
  async addEntry(
    @Param('userId') userId: string,
    @Body() createDto: CreateFileEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.memberFilesService.addEntry(
      userId,
      createDto.type,
      createDto.content,
      user.id,
    );
  }

  // Eintrag löschen
  @Delete('entries/:entryId')
  async deleteEntry(@Param('entryId') entryId: string) {
    return this.memberFilesService.deleteEntry(entryId);
  }

  // Letzten Uprank aktualisieren
  @Patch(':userId/uprank')
  async updateLastUprank(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateUprankDto,
  ) {
    return this.memberFilesService.updateLastUprank(
      userId,
      new Date(updateDto.lastUprankDate),
    );
  }

  // Akte archivieren (Blood Out)
  @Patch(':userId/archive')
  async archiveFile(@Param('userId') userId: string) {
    return this.memberFilesService.archiveFile(userId);
  }

  // Akte wiederherstellen
  @Patch(':userId/restore')
  async restoreFile(@Param('userId') userId: string) {
    return this.memberFilesService.restoreFile(userId);
  }
}

