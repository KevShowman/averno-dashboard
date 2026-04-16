import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { FamilyContactsService } from './family-contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('family-contacts')
@UseGuards(JwtAuthGuard)
export class FamilyContactsController {
  constructor(private readonly familyContactsService: FamilyContactsService) {}

  @Get()
  findAll() {
    return this.familyContactsService.findAll();
  }

  @Get('export')
  async exportCSV(@Res() res: Response) {
    const csv = await this.familyContactsService.exportToCSV();
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="familien-kontakte.csv"');
    res.send('\ufeff' + csv); // BOM für Excel UTF-8 Kompatibilität
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.familyContactsService.findOne(id);
  }

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() data: {
      familyName: string;
      status?: 'UNKNOWN' | 'ACTIVE' | 'ENDANGERED' | 'DISSOLVED';
      propertyZip?: string;
      contact1FirstName?: string;
      contact1LastName?: string;
      contact1Phone?: string;
      contact2FirstName?: string;
      contact2LastName?: string;
      contact2Phone?: string;
      leadershipInfo?: string;
      notes?: string;
      isKeyFamily?: boolean;
    },
  ) {
    return this.familyContactsService.create(user, data);
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: {
      familyName?: string;
      status?: 'UNKNOWN' | 'ACTIVE' | 'ENDANGERED' | 'DISSOLVED';
      propertyZip?: string;
      contact1FirstName?: string;
      contact1LastName?: string;
      contact1Phone?: string;
      contact2FirstName?: string;
      contact2LastName?: string;
      contact2Phone?: string;
      leadershipInfo?: string;
      notes?: string;
      isKeyFamily?: boolean;
    },
  ) {
    return this.familyContactsService.update(user, id, data);
  }

  // Als veraltet markieren - für ALLE User zugänglich
  @Patch(':id/mark-outdated')
  markOutdated(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { isOutdated: boolean; comment?: string },
  ) {
    return this.familyContactsService.markOutdated(user, id, data.isOutdated, data.comment);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.familyContactsService.delete(user, id);
  }

  // ============ PERMISSION MANAGEMENT ============

  @Get('permissions/list')
  getListPermissions() {
    return this.familyContactsService.getListPermissions();
  }

  @Post('permissions/list')
  addListPermission(
    @CurrentUser() user: any,
    @Body() data: { userId: string },
  ) {
    return this.familyContactsService.addListPermission(user, data.userId);
  }

  @Delete('permissions/list/:userId')
  removeListPermission(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
  ) {
    return this.familyContactsService.removeListPermission(user, userId);
  }
}

