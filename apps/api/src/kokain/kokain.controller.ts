import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { KokainService } from './kokain.service';

@Controller('kokain')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KokainController {
  constructor(private kokainService: KokainService) {}

  @Post('deposit')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SICARIO, Role.SOLDADO)
  async createDeposit(
    @Body('packages') packages: number,
    @Body('note') note: string,
    @CurrentUser() user: User,
  ) {
    return this.kokainService.createDeposit(user.id, packages, note);
  }

  // Prüfen ob User eine ausstehende Wochenabgabe hat
  @Get('check-weekly-delivery')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SICARIO, Role.SOLDADO)
  async checkPendingWeeklyDelivery(@CurrentUser() user: User) {
    return this.kokainService.checkPendingWeeklyDelivery(user.id);
  }

  // Kokain-Deposit mit Wochenabgabe-Integration erstellen
  @Post('deposit-with-weekly-delivery')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SICARIO, Role.SOLDADO)
  async createDepositWithWeeklyDelivery(
    @Body('packages') packages: number,
    @Body('note') note: string,
    @Body('useForWeeklyDelivery') useForWeeklyDelivery: boolean,
    @Body('weeklyDeliveryId') weeklyDeliveryId: string,
    @CurrentUser() user: User,
  ) {
    return this.kokainService.createDepositWithWeeklyDelivery(
      user.id,
      packages,
      note,
      useForWeeklyDelivery,
      weeklyDeliveryId
    );
  }

  @Get('deposits/pending')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.LOGISTICA, Role.SICARIO, Role.SOLDADO)
  async getPendingDeposits() {
    return this.kokainService.getPendingDeposits();
  }

  @Get('deposits/confirmed')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.LOGISTICA, Role.SICARIO, Role.SOLDADO)
  async getConfirmedDeposits() {
    return this.kokainService.getConfirmedDeposits();
  }

  @Patch('deposit/:id/confirm')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.LOGISTICA)
  async confirmDeposit(
    @Param('id') depositId: string,
    @CurrentUser() user: User,
  ) {
    if (!this.kokainService.canConfirmDeposit(user.role)) {
      throw new BadRequestException('Keine Berechtigung zum Bestätigen von Deposits');
    }
    
    return this.kokainService.confirmDeposit(depositId, user.id);
  }

  @Patch('deposit/:id/reject')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.LOGISTICA)
  async rejectDeposit(
    @Param('id') depositId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    if (!this.kokainService.canConfirmDeposit(user.role)) {
      throw new BadRequestException('Keine Berechtigung zum Ablehnen von Deposits');
    }
    
    return this.kokainService.rejectDeposit(depositId, user.id, reason);
  }

  @Get('summary')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SICARIO, Role.SOLDADO)
  async getCurrentDepositSummary() {
    return this.kokainService.getCurrentDepositSummary();
  }

  @Get('price')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.SICARIO, Role.SOLDADO)
  async getKokainPrice() {
    return { price: await this.kokainService.getKokainPrice() };
  }

  @Post('price')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG)
  async setKokainPrice(
    @Body('price') price: number,
    @CurrentUser() user: User,
  ) {
    return this.kokainService.setKokainPrice(price, user.id);
  }

  @Post('archive')
  @Roles(Role.EL_PATRON, Role.DON)
  async archiveCurrentDeposits(
    @Body('name') archiveName: string,
    @CurrentUser() user: User,
  ) {
    return this.kokainService.archiveCurrentDeposits(user.id, archiveName);
  }

  @Get('deposits/recent')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.LOGISTICA, Role.SOLDADO)
  async getRecentDeposits() {
    return this.kokainService.getRecentDeposits();
  }

  @Get('archives')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.LOGISTICA)
  async getArchivedUebergaben() {
    return this.kokainService.getArchivedUebergaben();
  }

  @Get('archives/:id')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.ROUTENVERWALTUNG, Role.LOGISTICA)
  async getArchiveDetails(@Param('id') archiveId: string) {
    return this.kokainService.getArchiveDetails(archiveId);
  }

  @Delete('deposit/:id')
  @Roles(Role.EL_PATRON, Role.DON, Role.ROUTENVERWALTUNG)
  async removeDeposit(
    @Param('id') depositId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    if (!this.kokainService.canConfirmDeposit(user.role)) {
      throw new BadRequestException('Keine Berechtigung zum Entfernen von Deposits');
    }
    
    return this.kokainService.removePendingDeposit(depositId, user.id, reason);
  }
}
