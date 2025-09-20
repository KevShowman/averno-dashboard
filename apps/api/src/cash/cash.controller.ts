import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User, TransactionStatus } from '@prisma/client';
import { CashService, CreateTransactionDto } from './cash.service';

@Controller('cash')
@UseGuards(JwtAuthGuard)
export class CashController {
  constructor(private cashService: CashService) {}

  @Get('summary')
  async getSummary(@Query('range') range?: 'day' | 'week' | 'month') {
    return this.cashService.getSummary(range);
  }

  @Get('transactions')
  async getTransactions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('category') category?: string,
    @Query('status') status?: TransactionStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cashService.getTransactions({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      category,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('transactions')
  async createTransaction(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() user: User,
  ) {
    return this.cashService.createTransaction(createTransactionDto, user.id, user.role);
  }

  @Post('transactions/:id/approve')
  @Roles(Role.EL_PATRON)
  @UseGuards(RolesGuard)
  async approveTransaction(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.cashService.approveTransaction(id, user.id, user.role);
  }

  @Post('transactions/:id/reject')
  @Roles(Role.EL_PATRON)
  @UseGuards(RolesGuard)
  async rejectTransaction(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.cashService.rejectTransaction(id, user.id, user.role);
  }

  @Get('categories')
  async getCategories() {
    return this.cashService.getCategories();
  }

  @Get('chart')
  async getChartData(@Query('range') range?: 'week' | 'month' | 'year') {
    return this.cashService.getChartData(range);
  }
}
