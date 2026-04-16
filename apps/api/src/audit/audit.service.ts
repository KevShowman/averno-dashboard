import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface AuditLogData {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  meta: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData) {
    return this.prisma.actionLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        meta: data.meta,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async getLogs(params: {
    entity?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const { entity, userId, from, to, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [logs, total] = await Promise.all([
      this.prisma.actionLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.actionLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
