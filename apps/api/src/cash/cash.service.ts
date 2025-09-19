import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MoneyKind, TransactionStatus, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

export interface CreateTransactionDto {
  kind: MoneyKind;
  amount: number;
  category?: string;
  note?: string;
  reference?: string;
}

export interface CashSummary {
  currentBalance: number;
  todayChange: number;
  weekChange: number;
  monthChange: number;
  pendingTransactions: number;
}

@Injectable()
export class CashService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getSummary(range: 'day' | 'week' | 'month' = 'month'): Promise<CashSummary> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all approved transactions to calculate balance
    const allTransactions = await this.prisma.moneyTransaction.findMany({
      where: { status: TransactionStatus.APPROVED },
    });

    let currentBalance = 0;
    for (const tx of allTransactions) {
      switch (tx.kind) {
        case MoneyKind.EINZAHLUNG:
          currentBalance += tx.amount;
          break;
        case MoneyKind.AUSZAHLUNG:
          currentBalance -= tx.amount;
          break;
        case MoneyKind.KORREKTUR:
          currentBalance = tx.amount; // Direct set
          break;
        // TRANSFER is neutral for total balance
      }
    }

    // Get period changes
    const [todayTx, weekTx, monthTx, pendingCount] = await Promise.all([
      this.prisma.moneyTransaction.findMany({
        where: {
          status: TransactionStatus.APPROVED,
          createdAt: { gte: today },
        },
      }),
      this.prisma.moneyTransaction.findMany({
        where: {
          status: TransactionStatus.APPROVED,
          createdAt: { gte: weekAgo },
        },
      }),
      this.prisma.moneyTransaction.findMany({
        where: {
          status: TransactionStatus.APPROVED,
          createdAt: { gte: monthAgo },
        },
      }),
      this.prisma.moneyTransaction.count({
        where: { status: TransactionStatus.PENDING },
      }),
    ]);

    const calculateChange = (transactions: any[]) => {
      return transactions.reduce((sum, tx) => {
        switch (tx.kind) {
          case MoneyKind.EINZAHLUNG:
            return sum + tx.amount;
          case MoneyKind.AUSZAHLUNG:
            return sum - tx.amount;
          default:
            return sum;
        }
      }, 0);
    };

    return {
      currentBalance,
      todayChange: calculateChange(todayTx),
      weekChange: calculateChange(weekTx),
      monthChange: calculateChange(monthTx),
      pendingTransactions: pendingCount,
    };
  }

  async getTransactions(params: {
    from?: Date;
    to?: Date;
    category?: string;
    status?: TransactionStatus;
    page?: number;
    limit?: number;
  }) {
    const { from, to, category, status, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.moneyTransaction.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, username: true, role: true },
          },
          approvedBy: {
            select: { id: true, username: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.moneyTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createTransaction(data: CreateTransactionDto, userId: string, userRole: Role) {
    // Get approval threshold from settings
    const thresholdSetting = await this.prisma.settings.findUnique({
      where: { key: 'approval_threshold' },
    });

    const threshold = (thresholdSetting?.value as any)?.amount || 100000;
    // El Patron kann alles ohne Genehmigung, alle anderen brauchen Genehmigung ab Schwellwert
    const needsApproval = Math.abs(data.amount) >= threshold && userRole !== Role.EL_PATRON;

    const transaction = await this.prisma.moneyTransaction.create({
      data: {
        ...data,
        createdById: userId,
        status: needsApproval ? TransactionStatus.PENDING : TransactionStatus.APPROVED,
        approvedById: needsApproval ? null : userId,
        approvedAt: needsApproval ? null : new Date(),
      },
      include: {
        createdBy: {
          select: { id: true, username: true, role: true },
        },
        approvedBy: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: 'MONEY_TX_CREATE',
      entity: 'MoneyTransaction',
      entityId: transaction.id,
      meta: {
        kind: data.kind,
        amount: data.amount,
        needsApproval,
        category: data.category,
      },
    });

    return transaction;
  }

  async approveTransaction(id: string, userId: string, userRole: Role) {
    if (userRole !== Role.EL_PATRON && userRole !== Role.DON) {
      throw new BadRequestException('Insufficient permissions to approve transactions');
    }

    const transaction = await this.prisma.moneyTransaction.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Transaction is not pending approval');
    }

    if (transaction.createdById === userId) {
      throw new BadRequestException('Cannot approve your own transaction');
    }

    const updatedTransaction = await this.prisma.moneyTransaction.update({
      where: { id },
      data: {
        status: TransactionStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: {
        createdBy: {
          select: { id: true, username: true, role: true },
        },
        approvedBy: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: 'MONEY_TX_APPROVE',
      entity: 'MoneyTransaction',
      entityId: id,
      meta: {
        kind: transaction.kind,
        amount: transaction.amount,
        createdBy: transaction.createdBy.username,
      },
    });

    return updatedTransaction;
  }

  async rejectTransaction(id: string, userId: string, userRole: Role) {
    if (userRole !== Role.EL_PATRON && userRole !== Role.DON) {
      throw new BadRequestException('Insufficient permissions to reject transactions');
    }

    const transaction = await this.prisma.moneyTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Transaction is not pending approval');
    }

    const updatedTransaction = await this.prisma.moneyTransaction.update({
      where: { id },
      data: {
        status: TransactionStatus.REJECTED,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: {
        createdBy: {
          select: { id: true, username: true, role: true },
        },
        approvedBy: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    await this.auditService.log({
      userId,
      action: 'MONEY_TX_REJECT',
      entity: 'MoneyTransaction',
      entityId: id,
      meta: {
        kind: transaction.kind,
        amount: transaction.amount,
      },
    });

    return updatedTransaction;
  }

  async getCategories() {
    const transactions = await this.prisma.moneyTransaction.findMany({
      where: {
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
    });

    return transactions
      .map(tx => tx.category)
      .filter(Boolean)
      .sort();
  }

  async getChartData(range: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupBy = 'month';
        break;
    }

    const transactions = await this.prisma.moneyTransaction.findMany({
      where: {
        status: TransactionStatus.APPROVED,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group transactions by date and calculate running balance
    const chartData: Array<{ date: string; balance: number; income: number; expenses: number }> = [];
    let runningBalance = 0;

    // First, get the balance up to the start date
    const previousTransactions = await this.prisma.moneyTransaction.findMany({
      where: {
        status: TransactionStatus.APPROVED,
        createdAt: { lt: startDate },
      },
    });

    for (const tx of previousTransactions) {
      switch (tx.kind) {
        case MoneyKind.EINZAHLUNG:
          runningBalance += tx.amount;
          break;
        case MoneyKind.AUSZAHLUNG:
          runningBalance -= tx.amount;
          break;
        case MoneyKind.KORREKTUR:
          runningBalance = tx.amount;
          break;
      }
    }

    // Group by day/month
    const grouped = new Map<string, { income: number; expenses: number }>();
    
    for (const tx of transactions) {
      const dateKey = groupBy === 'day' 
        ? tx.createdAt.toISOString().split('T')[0]
        : tx.createdAt.toISOString().substring(0, 7);

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { income: 0, expenses: 0 });
      }

      const group = grouped.get(dateKey)!;
      
      switch (tx.kind) {
        case MoneyKind.EINZAHLUNG:
          group.income += tx.amount;
          runningBalance += tx.amount;
          break;
        case MoneyKind.AUSZAHLUNG:
          group.expenses += tx.amount;
          runningBalance -= tx.amount;
          break;
        case MoneyKind.KORREKTUR:
          runningBalance = tx.amount;
          break;
      }
    }

    // Convert to array and sort
    for (const [date, data] of Array.from(grouped.entries()).sort()) {
      chartData.push({
        date,
        balance: runningBalance,
        income: data.income,
        expenses: data.expenses,
      });
    }

    return chartData;
  }
}
