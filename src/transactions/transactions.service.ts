import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DisputeStatus,
  NotificationType,
  OrderStatus,
  Role,
  TransactionStatus,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { MidtransService } from '../midtrans/midtrans.service';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private midtrans: MidtransService,
  ) {}

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
        order: { select: { status: true } },
      },
    });
  }

  async getDetailTransaction(transactionId: number) {
    return this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: { select: { fullName: true, email: true } },
        order: { select: { status: true } },
      },
    });
  }

  async verifyTransaction(
    adminId: number,
    transactionId: number,
    status: TransactionStatus,
    verificationNote?: string,
  ) {
    await this.checkAdminRole(adminId, [Role.SUPER_ADMIN, Role.ADMIN_FINANCE]);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { order: { include: { customOffer: true } } },
    });
    if (!transaction) {
      throw new NotFoundException(
        `Transaksi dengan ID ${transactionId} tidak ditemukan`,
      );
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(
        'Transaksi ini sudah diverifikasi atau ditolak sebelumnya.',
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status,
          verifiedBy: adminId,
          verificationNote: verificationNote ?? null,
        },
      });

      if (transaction.orderId) {
        const newOrderStatus =
          status === TransactionStatus.VERIFIED
            ? OrderStatus.IN_PROGRESS
            : OrderStatus.UNPAID;

        const deadlineDays =
          status === TransactionStatus.VERIFIED
            ? (transaction.order?.customOffer?.deadlineDays ?? 7)
            : null;
        const deadline =
          deadlineDays !== null
            ? new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000)
            : null;

        const order = await prisma.order.update({
          where: { id: transaction.orderId },
          data: {
            status: newOrderStatus,
            ...(deadline !== null && { deadline }),
          },
        });

        if (status === TransactionStatus.VERIFIED) {
          const nettPayout = order.totalAmount.sub(order.adminFee);
          await prisma.merchant.update({
            where: { id: order.merchantId },
            data: { pendingBalance: { increment: nettPayout } },
          });

          // NOT-01: notify merchant of new order
          const merchant = await prisma.merchant.findUnique({
            where: { id: order.merchantId },
          });
          if (merchant) {
            await this.notifications.create(
              merchant.userId,
              NotificationType.NEW_ORDER,
              'Pesanan Baru Masuk',
              `Pesanan #${order.id} telah dikonfirmasi. Silakan segera proses pesanan.`,
              JSON.stringify({ orderId: order.id }),
            );
          }
        } else {
          // Payment rejected → notify client to re-upload
          await this.notifications.create(
            transaction.userId,
            NotificationType.PAYMENT_REJECTED,
            'Bukti Pembayaran Ditolak',
            `Bukti pembayaran untuk pesanan #${order.id} ditolak. Silakan upload ulang.`,
            JSON.stringify({ orderId: order.id }),
          );
        }
      }

      return updatedTransaction;
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
      select: {
        id: true,
        status: true,
        clientId: true,
        merchantId: true,
        totalAmount: true,
        adminFee: true,
        paymentMethod: true,
        midtransTransactionId: true,
      },
    });
    if (!order) {
      throw new NotFoundException(
        `Transaksi dengan ID ${transactionId} tidak ditemukan`,
      );
    }
    if (order.status !== OrderStatus.REFUND_APPROVED_WAITING_FINANCE) {
      throw new BadRequestException('Transaksi tidak dapat di-refund');
    }

    // If paid via Midtrans, trigger Midtrans Refund API before updating DB
    if (order.paymentMethod === 'midtrans' && order.midtransTransactionId) {
      try {
        await this.midtrans.createRefund(
          order.midtransTransactionId,
          Number(order.totalAmount),
          'Dispute resolved — refund approved by validator',
        );
      } catch (err: any) {
        throw new BadRequestException(
          `Midtrans refund gagal: ${err?.message ?? 'Unknown error'}`,
        );
      }
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedOrder = await prisma.order.update({
        where: { id: transactionId },
        data: { status: OrderStatus.REFUNDED },
      });

      const nettPayout = order.totalAmount.sub(order.adminFee);
      await prisma.merchant.update({
        where: { id: order.merchantId },
        data: { pendingBalance: { decrement: nettPayout } },
      });

      await prisma.dispute.updateMany({
        where: {
          orderId: transactionId,
          status: { not: DisputeStatus.CLOSED },
        },
        data: { status: DisputeStatus.CLOSED },
      });

      // NOT-09: notify client dispute resolved (refund)
      await this.notifications.create(
        order.clientId,
        NotificationType.ORDER_REFUNDED,
        'Sengketa Diselesaikan — Refund Diproses',
        `Sengketa untuk pesanan #${order.id} telah diselesaikan. Dana Anda akan dikembalikan.`,
        JSON.stringify({ orderId: order.id }),
      );

      return updatedOrder;
    });
  }

  async getPendingReleaseTransactions() {
    return this.prisma.order.findMany({
      where: { status: OrderStatus.RELEASE_APPROVED_WAITING_FINANCE },
      include: {
        client: { select: { fullName: true, email: true } },
        gig: { select: { title: true } },
      },
    });
  }

  async releaseTransaction(adminId: number, transactionId: number) {
    await this.checkAdminRole(adminId, [Role.SUPER_ADMIN, Role.ADMIN_FINANCE]);
    const order = await this.prisma.order.findUnique({
      where: { id: transactionId },
    });
    if (!order) {
      throw new NotFoundException(
        `Transaksi dengan ID ${transactionId} tidak ditemukan`,
      );
    }
    if (order.status !== OrderStatus.RELEASE_APPROVED_WAITING_FINANCE) {
      throw new BadRequestException(
        'Dana transaksi tidak dapat diteruskan ke merchant pada status ini',
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedOrder = await prisma.order.update({
        where: { id: transactionId },
        data: {
          status: OrderStatus.COMPLETED,
        },
      });

      const nettPayout = order.totalAmount.sub(order.adminFee);

      await prisma.merchant.update({
        where: { id: order.merchantId },
        data: {
          pendingBalance: { decrement: nettPayout },
          walletBalance: { increment: nettPayout },
        },
      });

      await prisma.dispute.updateMany({
        where: {
          orderId: transactionId,
          status: { not: DisputeStatus.CLOSED },
        },
        data: { status: DisputeStatus.CLOSED },
      });

      // NOT-09: notify client dispute resolved (release / completed)
      await this.notifications.create(
        order.clientId,
        NotificationType.ORDER_COMPLETED,
        'Sengketa Diselesaikan — Pesanan Selesai',
        `Sengketa untuk pesanan #${order.id} telah diselesaikan. Pesanan dinyatakan selesai.`,
        JSON.stringify({ orderId: order.id }),
      );

      return updatedOrder;
    });
  }

  /**
   * Ringkasan finansial untuk dashboard Finance Admin.
   * - Saldo Escrow: dana yang sedang ditahan (order IN_PROGRESS, DELIVERED, IN_REVISION, DISPUTE)
   * - Komparasi periode: persentase pertumbuhan vs periode sebelumnya
   */
  async getFinancialSummary(
    adminId: number,
    period: 'day' | 'week' | 'month' = 'month',
  ) {
    await this.checkAdminRole(adminId, [Role.SUPER_ADMIN, Role.ADMIN_FINANCE]);

    const now = new Date();

    // Hitung durasi periode dalam milidetik
    let periodMs: number;
    switch (period) {
      case 'day':
        periodMs = 24 * 60 * 60 * 1000;
        break;
      case 'week':
        periodMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        periodMs = 30 * 24 * 60 * 60 * 1000;
        break;
    }

    const currentStart = new Date(now.getTime() - periodMs);
    const previousStart = new Date(currentStart.getTime() - periodMs);

    // --- Saldo Escrow (total dana yang masih "ditahan" platform) ---
    const escrowStatuses = [
      OrderStatus.IN_PROGRESS,
      OrderStatus.DELIVERED,
      OrderStatus.IN_REVISION,
      OrderStatus.DISPUTE_IN_PROGRESS,
      OrderStatus.REFUND_APPROVED_WAITING_FINANCE,
      OrderStatus.RELEASE_APPROVED_WAITING_FINANCE,
    ];

    const escrowOrders = await this.prisma.order.findMany({
      where: { status: { in: escrowStatuses } },
      select: { totalAmount: true },
    });

    let escrowBalance = 0;
    for (const order of escrowOrders) {
      escrowBalance += Number(order.totalAmount);
    }

    // --- Revenue periode saat ini vs sebelumnya ---
    const currentCompletedOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        createdAt: { gte: currentStart, lte: now },
      },
      select: { totalAmount: true, adminFee: true },
    });

    const previousCompletedOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        createdAt: { gte: previousStart, lt: currentStart },
      },
      select: { totalAmount: true, adminFee: true },
    });

    let currentGmv = 0;
    let currentRevenue = 0;
    for (const o of currentCompletedOrders) {
      currentGmv += Number(o.totalAmount);
      currentRevenue += Number(o.adminFee);
    }

    let previousGmv = 0;
    let previousRevenue = 0;
    for (const o of previousCompletedOrders) {
      previousGmv += Number(o.totalAmount);
      previousRevenue += Number(o.adminFee);
    }

    // Hitung persentase pertumbuhan
    const calcGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(2));
    };

    // --- Refund di periode saat ini ---
    const refundedOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.REFUNDED,
        createdAt: { gte: currentStart, lte: now },
      },
      select: { totalAmount: true },
    });

    let totalRefunded = 0;
    for (const o of refundedOrders) {
      totalRefunded += Number(o.totalAmount);
    }

    return {
      period,
      currentPeriod: { start: currentStart, end: now },
      previousPeriod: { start: previousStart, end: currentStart },
      escrow: {
        balance: escrowBalance,
        activeOrderCount: escrowOrders.length,
      },
      revenue: {
        current: {
          gmv: currentGmv,
          platformRevenue: currentRevenue,
          completedCount: currentCompletedOrders.length,
        },
        previous: {
          gmv: previousGmv,
          platformRevenue: previousRevenue,
          completedCount: previousCompletedOrders.length,
        },
        growth: {
          gmvPercent: calcGrowth(currentGmv, previousGmv),
          revenuePercent: calcGrowth(currentRevenue, previousRevenue),
        },
      },
      refunds: {
        totalRefunded,
        refundedCount: refundedOrders.length,
      },
    };
  }
}
