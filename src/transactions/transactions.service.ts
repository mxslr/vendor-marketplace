import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisputeStatus, NotificationType, OrderStatus, Role, TransactionStatus } from '@prisma/client';
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
        data: { status, verifiedBy: adminId, verificationNote: verificationNote ?? null },
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
        where: { orderId: transactionId, status: { not: DisputeStatus.CLOSED } },
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
      throw new BadRequestException('Dana transaksi tidak dapat diteruskan ke merchant pada status ini');
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
        where: { orderId: transactionId, status: { not: DisputeStatus.CLOSED } },
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
}
