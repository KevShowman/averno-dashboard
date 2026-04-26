import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { PackagesService } from './packages.service';

@Controller('packages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackagesController {
  constructor(private packagesService: PackagesService) {}

  @Post('deposit')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.SICARIO, Role.LINCE)
  async createDeposit(
    @Body('packages') packages: number,
    @Body('note') note: string,
    @CurrentUser() user: User,
  ) {
    return this.packagesService.createDeposit(user.id, packages, note);
  }

  // Prüfen ob User eine ausstehende Wochenabgabe hat
  @Get('check-weekly-delivery')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.SICARIO, Role.LINCE)
  async checkPendingWeeklyDelivery(@CurrentUser() user: User) {
    return this.packagesService.checkPendingWeeklyDelivery(user.id);
  }

  // Package-Deposit mit Wochenabgabe-Integration erstellen
  @Post('deposit-with-weekly-delivery')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.SICARIO, Role.LINCE)
  async createDepositWithWeeklyDelivery(
    @Body('packages') packages: number,
    @Body('note') note: string,
    @Body('useForWeeklyDelivery') useForWeeklyDelivery: boolean,
    @Body('weeklyDeliveryId') weeklyDeliveryId: string,
    @CurrentUser() user: User,
  ) {
    return this.packagesService.createDepositWithWeeklyDelivery(
      user.id,
      packages,
      note,
      useForWeeklyDelivery,
      weeklyDeliveryId
    );
  }

  @Get('deposits/pending')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.LOGISTICA, Role.SICARIO, Role.LINCE)
  async getPendingDeposits() {
    return this.packagesService.getPendingDeposits();
  }

  @Get('deposits/confirmed')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.LOGISTICA, Role.SICARIO, Role.LINCE)
  async getConfirmedDeposits() {
    return this.packagesService.getConfirmedDeposits();
  }

  @Patch('deposit/:id/confirm')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.LOGISTICA, Role.ADMIN)
  async confirmDeposit(
    @Param('id') depositId: string,
    @CurrentUser() user: User,
  ) {
    if (!this.packagesService.canConfirmDeposit(user.role)) {
      throw new BadRequestException('Keine Berechtigung zum Bestätigen von Deposits');
    }
    
    return this.packagesService.confirmDeposit(depositId, user.id);
  }

  @Patch('deposit/:id/reject')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.LOGISTICA, Role.ADMIN)
  async rejectDeposit(
    @Param('id') depositId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    if (!this.packagesService.canConfirmDeposit(user.role)) {
      throw new BadRequestException('Keine Berechtigung zum Ablehnen von Deposits');
    }
    
    return this.packagesService.rejectDeposit(depositId, user.id, reason);
  }

  @Get('summary')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.SICARIO, Role.LINCE)
  async getCurrentDepositSummary() {
    return this.packagesService.getCurrentDepositSummary();
  }

  @Get('price')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.SICARIO, Role.LINCE)
  async getPackagePrice() {
    return { price: await this.packagesService.getPackagePrice() };
  }

  @Post('price')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS)
  async setPackagePrice(
    @Body('price') price: number,
    @CurrentUser() user: User,
  ) {
    return this.packagesService.setPackagePrice(price, user.id);
  }

  @Post('archive')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  async archiveCurrentDeposits(
    @Body('name') archiveName: string,
    @CurrentUser() user: User,
  ) {
    return this.packagesService.archiveCurrentDeposits(user.id, archiveName);
  }

  @Get('deposits/recent')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.LOGISTICA, Role.LINCE)
  async getRecentDeposits() {
    return this.packagesService.getRecentDeposits();
  }

  @Get('archives')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.LOGISTICA)
  async getArchivedHandovers() {
    return this.packagesService.getArchivedHandovers();
  }

  @Get('archives/:id')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.LOGISTICA)
  async getArchiveDetails(@Param('id') archiveId: string) {
    return this.packagesService.getArchiveDetails(archiveId);
  }

  @Delete('deposit/:id')
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN, Role.ROUTENVERWALTUNG, Role.RUTAS, Role.LOGISTICA)
  async removeDeposit(
    @Param('id') depositId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    if (!this.packagesService.canConfirmDeposit(user.role)) {
      throw new BadRequestException('Keine Berechtigung zum Entfernen von Deposits');
    }
    
    return this.packagesService.removePendingDeposit(depositId, user.id, reason);
  }
}
