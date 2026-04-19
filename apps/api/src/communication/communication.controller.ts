import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CommunicationService } from './communication.service';

interface UpdateFunkDto {
  funkFrequency: string;
}

interface UpdateDarkChatDto {
  darkChatName: string;
}

@Controller('communication')
@UseGuards(JwtAuthGuard)
export class CommunicationController {
  constructor(private communicationService: CommunicationService) {}

  // Funk und DarkChat abrufen (alle User)
  @Get()
  async getCommunicationInfo() {
    return this.communicationService.getCommunicationInfo();
  }

  // Funk-Frequenz aktualisieren (nur Leaderschaft)
  @Put('funk')
  @Roles(Role.PATRON, Role.DON, Role.CAPO)
  @UseGuards(RolesGuard)
  async updateFunkFrequency(@Body() updateDto: UpdateFunkDto) {
    return this.communicationService.updateFunkFrequency(updateDto.funkFrequency);
  }

  // DarkChat-Name aktualisieren (nur Leaderschaft)
  @Put('darkchat')
  @Roles(Role.PATRON, Role.DON, Role.CAPO)
  @UseGuards(RolesGuard)
  async updateDarkChatName(@Body() updateDto: UpdateDarkChatDto) {
    return this.communicationService.updateDarkChatName(updateDto.darkChatName);
  }
}

