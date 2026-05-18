import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

  async set(adminId: number, key: string, value: string, confirmPassword: string) {
    const admin = await this.requireSuperAdmin(adminId);

    // CFG-03: verify password confirmation before allowing config change
    const isPasswordValid = await bcrypt.compare(confirmPassword, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Konfirmasi password salah.');
    }

    // Fetch old value for audit log
    const existing = await this.prisma.systemConfig.findUnique({ where: { key } });
    const oldValue = existing?.value ?? null;

    const result = await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedBy: adminId },
      create: { key, value, updatedBy: adminId },
    });

    // Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'SET_CONFIG',
        key,
        oldValue,
        newValue: value,
      },
    });

    return result;
  }

  async getAuditLogs(adminId: number) {
    await this.requireSuperAdmin(adminId);
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true } } },
    });
  }

  async isMaintenanceMode(): Promise<boolean> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'maintenance_mode' },
    });
    return config?.value === 'true';
  }
}
