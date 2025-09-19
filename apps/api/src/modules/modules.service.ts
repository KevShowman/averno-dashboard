import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ModulesService {
  constructor(private prisma: PrismaService) {}

  async getEnabledModules() {
    return this.prisma.module.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });
  }

  async getAllModules() {
    return this.prisma.module.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async toggleModule(key: string, enabled: boolean) {
    return this.prisma.module.update({
      where: { key },
      data: { enabled },
    });
  }
}
