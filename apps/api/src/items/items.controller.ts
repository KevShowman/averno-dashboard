import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { ItemsService, CreateItemDto, UpdateItemDto, MoveItemDto, InventoryCountDto } from './items.service';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Get()
  async getItems(
    @Query('query') query?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('criticalOnly') criticalOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.itemsService.getItems({
      query,
      category,
      tag,
      criticalOnly: criticalOnly === 'true',
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('categories')
  async getCategories() {
    return this.itemsService.getCategories();
  }

  @Post('categories')
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async createCategory(
    @Body('name') name: string,
    @CurrentUser() user: User,
  ) {
    return this.itemsService.createCategory(name, user.id);
  }

  @Get(':id')
  async getItemById(@Param('id') id: string) {
    return this.itemsService.getItemById(id);
  }

  @Post()
  @Roles(Role.EL_PATRON, Role.DON, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async createItem(
    @Body() createItemDto: CreateItemDto,
    @CurrentUser() user: User,
  ) {
    return this.itemsService.createItem(createItemDto, user.id);
  }

  @Patch(':id')
  @Roles(Role.EL_PATRON, Role.DON, Role.ASESOR, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async updateItem(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
    @CurrentUser() user: User,
  ) {
    return this.itemsService.updateItem(id, updateItemDto, user.id);
  }

  @Post(':id/move')
  @Roles(Role.EL_PATRON, Role.ASESOR, Role.DON, Role.LOGISTICA)
  @UseGuards(RolesGuard)
  async moveItem(
    @Param('id') id: string,
    @Body() moveItemDto: MoveItemDto,
    @CurrentUser() user: User,
  ) {
    return this.itemsService.moveItem(id, moveItemDto, user.id, user.role);
  }

  @Get(':id/movements')
  async getItemMovements(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.itemsService.getItemMovements(id, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('inventory/count')
  @Roles(Role.EL_PATRON, Role.DON)
  @UseGuards(RolesGuard)
  async performInventoryCount(
    @Body() counts: InventoryCountDto[],
    @CurrentUser() user: User,
  ) {
    return this.itemsService.performInventoryCount(counts, user.id);
  }

  @Get('movements/recent')
  async getRecentMovements() {
    return this.itemsService.getRecentMovements();
  }

  @Get('movements/pending')
  async getPendingMovements() {
    return this.itemsService.getPendingMovements();
  }

  @Patch('movements/:id/approve')
  @Roles(Role.EL_PATRON, Role.LOGISTICA, Role.DON) // Temporär: Don kann auch genehmigen
  @UseGuards(RolesGuard)
  async approveMovement(
    @Param('id') movementId: string,
    @CurrentUser() user: User,
  ) {
    return this.itemsService.approveMovement(movementId, user.id);
  }

  @Patch('movements/:id/reject')
  @Roles(Role.EL_PATRON, Role.LOGISTICA, Role.DON) // Temporär: Don kann auch ablehnen
  @UseGuards(RolesGuard)
  async rejectMovement(
    @Param('id') movementId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    return this.itemsService.rejectMovement(movementId, user.id, reason);
  }
}
