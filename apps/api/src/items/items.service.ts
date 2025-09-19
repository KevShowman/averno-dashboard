import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MovementType, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

export interface CreateItemDto {
  name: string;
  sku?: string;
  categoryId: string;
  minStock?: number;
  tags?: string[];
  location?: string;
}

export interface UpdateItemDto {
  name?: string;
  sku?: string;
  categoryId?: string;
  minStock?: number;
  tags?: string[];
  location?: string;
  isLocked?: boolean;
}

export interface MoveItemDto {
  type: MovementType;
  quantity: number;
  note?: string;
  reference?: string;
  batchNumber?: string;
}

export interface InventoryCountDto {
  itemId: string;
  countedQty: number;
  note?: string;
}

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getItems(params: {
    query?: string;
    category?: string;
    tag?: string;
    criticalOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { query, category, tag, criticalOnly, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { name: category };
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (criticalOnly) {
      where.currentStock = { lte: this.prisma.item.fields.minStock };
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: [
          { category: { name: 'asc' } },
          { name: 'asc' }
        ],
        skip,
        take: limit,
      }),
      this.prisma.item.count({ where }),
    ]);

    // Add critical status
    const itemsWithStatus = items.map(item => ({
      ...item,
      isCritical: item.currentStock <= item.minStock,
      availableStock: item.currentStock - item.reservedStock,
    }));

    return {
      items: itemsWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getItemById(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        stockEntries: {
          include: {
            createdBy: {
              select: { id: true, username: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 movements
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return {
      ...item,
      isCritical: item.currentStock <= item.minStock,
      availableStock: item.currentStock - item.reservedStock,
    };
  }

  async createItem(data: CreateItemDto, userId: string) {
    const item = await this.prisma.item.create({
      data: {
        ...data,
        tags: data.tags || [],
      },
      include: {
        category: true,
      },
    });

    await this.auditService.log({
      userId,
      action: 'ITEM_CREATE',
      entity: 'Item',
      entityId: item.id,
      meta: { itemName: item.name, sku: item.sku },
    });

    return item;
  }

  async updateItem(id: string, data: UpdateItemDto, userId: string) {
    const existingItem = await this.prisma.item.findUnique({ where: { id } });
    if (!existingItem) {
      throw new NotFoundException('Item not found');
    }

    const item = await this.prisma.item.update({
      where: { id },
      data: {
        ...data,
        tags: data.tags !== undefined ? data.tags : undefined,
      },
      include: {
        category: true,
      },
    });

    await this.auditService.log({
      userId,
      action: 'ITEM_UPDATE',
      entity: 'Item',
      entityId: item.id,
      meta: { changes: data, itemName: item.name },
    });

    return item;
  }

  async moveItem(id: string, moveData: MoveItemDto, userId: string, userRole: Role) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.isLocked && userRole !== Role.EL_PATRON && userRole !== Role.DON) {
      throw new BadRequestException('Item is locked');
    }

    const { type, quantity, note, reference, batchNumber } = moveData;

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    // Calculate new stock based on movement type
    let newStock = item.currentStock;
    let newReservedStock = item.reservedStock;

    switch (type) {
      case MovementType.IN:
        newStock += quantity;
        break;
      case MovementType.OUT:
        if (item.currentStock - item.reservedStock < quantity) {
          throw new BadRequestException('Insufficient available stock');
        }
        newStock -= quantity;
        break;
      case MovementType.ADJUST:
        newStock = quantity; // Direct set
        break;
      case MovementType.RESERVE:
        if (item.currentStock - item.reservedStock < quantity) {
          throw new BadRequestException('Insufficient available stock to reserve');
        }
        newReservedStock += quantity;
        break;
      case MovementType.RELEASE:
        if (item.reservedStock < quantity) {
          throw new BadRequestException('Cannot release more than reserved');
        }
        newReservedStock -= quantity;
        break;
    }

    // Use transaction to ensure consistency
    const result = await this.prisma.$transaction(async (prisma) => {
      // Update item stock
      const updatedItem = await prisma.item.update({
        where: { id },
        data: {
          currentStock: newStock,
          reservedStock: newReservedStock,
        },
      });

      // Create movement record
      const movement = await prisma.stockMovement.create({
        data: {
          itemId: id,
          type,
          quantity,
          previousStock: item.currentStock,
          newStock,
          note,
          reference,
          batchNumber,
          createdById: userId,
        },
        include: {
          item: { include: { category: true } },
          createdBy: {
            select: { id: true, username: true, role: true },
          },
        },
      });

      return { item: updatedItem, movement };
    });

    await this.auditService.log({
      userId,
      action: `STOCK_${type}`,
      entity: 'StockMovement',
      entityId: result.movement.id,
      meta: {
        itemName: item.name,
        quantity,
        previousStock: item.currentStock,
        newStock,
        type,
      },
    });

    return result;
  }

  async getItemMovements(id: string, params: { from?: Date; to?: Date; page?: number; limit?: number }) {
    const { from, to, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = { itemId: id };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, username: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async performInventoryCount(counts: InventoryCountDto[], userId: string) {
    const adjustments = [];

    for (const count of counts) {
      const item = await this.prisma.item.findUnique({ where: { id: count.itemId } });
      if (!item) continue;

      const difference = count.countedQty - item.currentStock;
      if (difference !== 0) {
        const result = await this.moveItem(
          count.itemId,
          {
            type: MovementType.ADJUST,
            quantity: count.countedQty,
            note: count.note || `Inventory count adjustment: ${difference > 0 ? '+' : ''}${difference}`,
          },
          userId,
          Role.DON, // Assume inventory can be done by Don or higher
        );
        adjustments.push(result);
      }
    }

    await this.auditService.log({
      userId,
      action: 'INVENTORY_COUNT',
      entity: 'Item',
      entityId: 'multiple',
      meta: { adjustmentsCount: adjustments.length, items: counts.length },
    });

    return adjustments;
  }

  async getCategories() {
    return this.prisma.itemCategory.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(name: string, userId: string) {
    const category = await this.prisma.itemCategory.create({
      data: { name },
    });

    await this.auditService.log({
      userId,
      action: 'CATEGORY_CREATE',
      entity: 'ItemCategory',
      entityId: category.id,
      meta: { categoryName: name },
    });

    return category;
  }

  async getRecentMovements() {
    const movements = await this.prisma.stockMovement.findMany({
      include: {
        item: {
          include: {
            category: true,
          },
        },
        createdBy: {
          select: { id: true, username: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { movements };
  }
}
