import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  private async requireSuperAdmin(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Hanya Super Admin yang dapat mengubah konfigurasi sistem.');
    }
    return user;
  }

  async getAll() {
    return this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async get(key: string) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundException(`Konfigurasi "${key}" tidak ditemukan.`);
    return config;
  }

  async set(adminId: number, key: string, value: string) {
    await this.requireSuperAdmin(adminId);

    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedBy: adminId },
      create: { key, value, updatedBy: adminId },
    });
  }

  async isMaintenanceMode(): Promise<boolean> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'maintenance_mode' },
    });
    return config?.value === 'true';
  }
}
