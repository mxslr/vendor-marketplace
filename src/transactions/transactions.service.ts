import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, Role, TransactionStatus } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  private async checkAdminRole(userId: number, allowedRoles: Role[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.',
      );
    }
  }

  async findMyTransactions(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    const merchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [{ userId }, { associates: { some: { userId } } }],
      },
    });

    if (merchant) {
      return this.prisma.transaction.findMany({
        where: { order: { merchantId: merchant.id } },
        include: {
          order: { select: { id: true, totalAmount: true, status: true } },
          user: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.transaction.findMany({
      where: { userId },
      include: {
        order: { select: { id: true, totalAmount: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(userId: number) {
    await this.checkAdminRole(userId, [Role.SUPER_ADMIN, Role.ADMIN_FINANCE]);

    return this.prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });
  }

  async verifyTransaction(
    adminId: number,
    transactionId: number,
    status: TransactionStatus,
  ) {
    await this.checkAdminRole(adminId, [Role.SUPER_ADMIN, Role.ADMIN_FINANCE]);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!transaction) {
      throw new NotFoundException(
        `Transaksi dengan ID ${transactionId} tidak ditemukan`,
      );
    }

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status,
        verifiedBy: adminId,
      },
    });
  }

  async getPendingRefundTransactions() {
    return this.prisma.order.findMany({
      where: { status: OrderStatus.REFUND_APPROVED_WAITING_FINANCE },
      include: {
        client: { select: { fullName: true, email: true } },
        gig: { select: { title: true } },
      },
    });
  }

  async refundTransaction(adminId: number, transactionId: number) {
    await this.checkAdminRole(adminId, [Role.SUPER_ADMIN, Role.ADMIN_FINANCE]);
    const order = await this.prisma.order.findUnique({
      where: { id: transactionId },
    });
    if (!order) {
      throw new NotFoundException(
        `Transaksi dengan ID ${transactionId} tidak ditemukan`,
      );
    }
    if (order.status !== OrderStatus.REFUND_APPROVED_WAITING_FINANCE) {
      throw new BadRequestException('Transaksi tidak dapat di-refund');
    }
    return this.prisma.order.update({
      where: { id: transactionId },
      data: {
        status: OrderStatus.REFUNDED,
      },
    });
  }
}
