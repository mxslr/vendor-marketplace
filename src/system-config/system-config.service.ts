import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role, OrderStatus } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  private async requireSuperAdmin(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Hanya Super Admin yang dapat mengubah konfigurasi sistem.',
      );
    }
    return user;
  }

  async getAll() {
    return this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async get(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    if (!config)
      throw new NotFoundException(`Konfigurasi "${key}" tidak ditemukan.`);
    return config;
  }

  async set(
    adminId: number,
    key: string,
    value: string,
    confirmPassword: string,
  ) {
    const admin = await this.requireSuperAdmin(adminId);

    // CFG-03: verify password confirmation before allowing config change
    const isPasswordValid = await bcrypt.compare(
      confirmPassword,
      admin.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Konfirmasi password salah.');
    }

    // Fetch old value for audit log
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
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

  async createAdminValidatorOrAdminFinance(
    adminId: number,
    email: string,
    fullName: string,
    passwordHash: string,
    role: Role,
  ) {
    await this.requireSuperAdmin(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Hanya Super Admin yang dapat membuat admin validator atau admin finance.',
      );
    }

    // Check duplicate email
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('Email sudah terdaftar.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(passwordHash, 10);

    const result = await this.prisma.user.create({
      data: {
        email: email,
        fullName: fullName,
        passwordHash: hashedPassword,
        role: role,
        createdAt: new Date(),
      },
    });
    return result;
  }

  async suspendAdmin(adminId: number, userId: number) {
    await this.requireSuperAdmin(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    if (
      user.role !== Role.ADMIN_VALIDATOR &&
      user.role !== Role.ADMIN_FINANCE
    ) {
      throw new ForbiddenException(
        'Hanya admin validator atau admin finance yang dapat di-suspend.',
      );
    }
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
      },
    });
    return result;
  }

  async unsuspendAdmin(adminId: number, userId: number) {
    await this.requireSuperAdmin(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    if (
      user.role !== Role.ADMIN_VALIDATOR &&
      user.role !== Role.ADMIN_FINANCE
    ) {
      throw new ForbiddenException(
        'Hanya admin validator atau admin finance yang dapat di-unsuspend.',
      );
    }
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: false,
      },
    });
    return result;
  }

  async deleteAdmin(adminId: number, userId: number) {
    await this.requireSuperAdmin(adminId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    if (
      user.role !== Role.ADMIN_VALIDATOR &&
      user.role !== Role.ADMIN_FINANCE
    ) {
      throw new ForbiddenException(
        'Hanya admin validator atau admin finance yang dapat dihapus.',
      );
    }
    const result = await this.prisma.user.delete({
      where: { id: userId },
    });
    return result;
  }

  async getUsersByStatus(adminId: number, status?: 'active' | 'suspended') {
    await this.requireSuperAdmin(adminId);

    const where: any = {
      role: {
        in: [Role.SUPER_ADMIN, Role.ADMIN_VALIDATOR, Role.ADMIN_FINANCE],
      },
    };

    if (status === 'active') {
      where.isSuspended = false;
    } else if (status === 'suspended') {
      where.isSuspended = true;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAuditLogs(adminId: number) {
    await this.requireSuperAdmin(adminId);
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, isSuspended: true } },
      },
    });
  }

  async getHealthCheckMidtrans() {
    try {
      const response = await axios.get(
        'https://api.midtrans.com/v2/status/transaction/123',
        { timeout: 3000 }
      );
      return response.data;
    } catch (error) {
      throw new Error('Midtrans service is not available.');
    }
  }

  async getTransactionAnalytics(
    adminId: number,
    period: 'day' | 'week' | 'month' = 'month',
  ) {
    await this.requireSuperAdmin(adminId);

    // Hitung tanggal awal berdasarkan periode
    const now = new Date();
    const startDate = new Date(now);
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // Order yang sudah COMPLETED dalam periode
    const completedOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        createdAt: { gte: startDate },
      },
      select: {
        totalAmount: true,
        adminFee: true,
      },
    });

    // Agregasi manual (Prisma Decimal perlu di-convert)
    let totalGmv = 0;
    let totalAdminFee = 0;
    for (const order of completedOrders) {
      totalGmv += Number(order.totalAmount);
      totalAdminFee += Number(order.adminFee);
    }
    const totalNetPayout = totalGmv - totalAdminFee;

    // Hitung jumlah order per status dalam periode
    const orderCountByStatus = await this.prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    });

    // Total transaksi (pembayaran) yang masuk dalam periode
    const transactionSummary = await this.prisma.transaction.aggregate({
      where: { createdAt: { gte: startDate } },
      _sum: { amount: true },
      _count: { id: true },
    });

    return {
      period,
      startDate,
      endDate: now,
      revenue: {
        gmv: totalGmv,                          // Total omzet kotor
        platformRevenue: totalAdminFee,          // Pendapatan platform (komisi)
        merchantPayout: totalNetPayout,          // Total yang dibayar ke merchant
        completedOrderCount: completedOrders.length,
      },
      ordersByStatus: orderCountByStatus.map((g) => ({
        status: g.status,
        count: g._count.id,
      })),
      transactions: {
        totalAmount: Number(transactionSummary._sum.amount ?? 0),
        totalCount: transactionSummary._count.id,
      },
    };
  }

  async isMaintenanceMode(adminId: number): Promise<boolean> {
    await this.requireSuperAdmin(adminId);
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'maintenance_mode' },
    });
    return config?.value === 'true';
  }
}
