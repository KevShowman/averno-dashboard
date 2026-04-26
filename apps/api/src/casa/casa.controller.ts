import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CasaService } from './casa.service';

@Controller('casa')
@UseGuards(JwtAuthGuard)
export class CasaController {
  constructor(private readonly casaService: CasaService) {}

  @Get()
  async getCasaInfo() {
    return this.casaService.getCasaInfo();
  }

  @Put('location')
  @UseGuards(RolesGuard)
  @Roles(Role.PATRON, Role.DON, Role.CAPO, Role.ADMIN)
  async updateLocation(
    @Body() body: { postalCode: string; additionalInfo: string },
  ) {
    return this.casaService.updateLocation(body.postalCode, body.additionalInfo);
  }
}
