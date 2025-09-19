import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getAllSettings() {
    return this.prisma.settings.findMany();
  }

  async updateApprovalThreshold(amount: number, userId: string) {
    const setting = await this.prisma.settings.upsert({
      where: { key: 'approval_threshold' },
      update: { value: { amount } },
      create: { key: 'approval_threshold', value: { amount } },
    });

    await this.auditService.log({
      userId,
      action: 'SETTINGS_UPDATE',
      entity: 'Settings',
      entityId: setting.id,
      meta: { key: 'approval_threshold', newValue: amount },
    });

    return setting;
  }
}

