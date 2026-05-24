import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  OrderStatus,
  GigStatus,
  AssociatePermission,
  TransactionType,
  TransactionStatus,
  MerchantBadge,
  NotificationType,
  Role,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { MidtransService } from '../midtrans/midtrans.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private midtrans: MidtransService,
    private config: ConfigService,
    private supabase: SupabaseService,
    private systemConfig: SystemConfigService,
  ) {}

  async createOrder(clientId: number, gigId: number) {
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
      include: { category: true },
    });
    if (!gig) throw new NotFoundException('Layanan tidak ditemukan.');
    if (gig.status !== GigStatus.ACTIVE && gig.status !== GigStatus.FEATURED) {
      throw new BadRequestException(
        'Layanan ini tidak tersedia untuk dipesan saat ini.',
      );
    }

    // CFG-01: read commission rate from SystemConfig (per-category override), fallback to category default
    let commissionRate = gig.category.commissionRate;
    try {
      const configKey = `commission_rate_${gig.category.id}`;
      const cfg = await this.systemConfig.get(configKey);
      const parsed = parseFloat(cfg.value);
      if (!isNaN(parsed)) commissionRate = new Prisma.Decimal(parsed);
    } catch {
      // Key not in SystemConfig — use category default
    }

    const adminFee = gig.price.mul(commissionRate).div(100);

    return this.prisma.order.create({
      data: {
        clientId,
        merchantId: gig.merchantId,
        gigId: gig.id,
        totalAmount: gig.price,
        adminFee,
      },
    });
  }

  async initiateMidtransPayment(
    orderId: number,
    clientId: number,
  ): Promise<{
    snapToken: string;
    clientKey: string;
    midtransOrderId: string;
  }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientId },
      include: {
        client: true,
        gig: true,
      },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan.');
    if (order.status !== OrderStatus.UNPAID) {
      throw new BadRequestException(
        'Pesanan ini sudah dibayar atau sedang diproses.',
      );
    }

    const midtransOrderId = `order-${order.id}-${Date.now()}`;
    const gigTitle = order.gig?.title ?? 'Layanan Vendor Marketplace';

    console.log(
      `[Midtrans] initiate-payment for orderId=${order.id} → midtransOrderId="${midtransOrderId}"`,
    );
    console.log(
      `[Midtrans] Use this order_id in manual webhook simulation: "${midtransOrderId}"`,
    );

    const snapToken = await this.midtrans.createSnapToken({
      orderId: midtransOrderId,
      amount: Number(order.totalAmount),
      customerDetails: {
        firstName: order.client.fullName,
        email: order.client.email,
      },
      itemDetails: [
        {
          id: String(order.gigId ?? order.id),
          price: Number(order.totalAmount),
          quantity: 1,
          name: gigTitle,
        },
      ],
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { snapToken },
    });

    return {
      snapToken,
      clientKey: this.config.get<string>('MIDTRANS_CLIENT_KEY') ?? '',
      midtransOrderId,
    };
  }

  async findMyOrders(clientId: number) {
    return this.prisma.order.findMany({
      where: { clientId: clientId },
      include: { gig: true, merchant: true },
    });
  }

  async payOrder(orderId: number, clientId: number, proofUrl?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientId: clientId },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan.');
    }
    if (order.status !== OrderStatus.UNPAID) {
      throw new BadRequestException('Pesanan ini sudah dibayar atau diproses.');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID_PENDING_CONFIRMATION },
      });

      const newTransaction = await prisma.transaction.create({
        data: {
          orderId: order.id,
          userId: clientId,
          type: TransactionType.PAYMENT,
          amount: order.totalAmount,
          status: TransactionStatus.PENDING,
          proofUrl: proofUrl ?? null,
        },
      });

      // NOT-03: notify Finance Admins of new pending payment
      await this.notifications.createForRole(
        Role.ADMIN_FINANCE,
        NotificationType.PAYMENT_PENDING,
        'Pembayaran Manual Menunggu Konfirmasi',
        `Pesanan #${order.id} menunggu verifikasi bukti transfer.`,
        JSON.stringify({ orderId: order.id }),
      );

      return {
        message: 'Pembayaran berhasil, menunggu konfirmasi Finance.',
        order: updatedOrder,
        transaction: newTransaction,
      };
    });
  }

  async getIncomingOrders(userId: number) {
    const myMerchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [
          { userId: userId },
          {
            associates: {
              some: {
                userId: userId,
                permission: {
                  in: [
                    AssociatePermission.MANAGE_ORDERS,
                    AssociatePermission.FULL_ACCESS,
                  ],
                },
              },
            },
          },
        ],
      },
    });

    if (!myMerchant)
      throw new NotFoundException('Toko tidak ditemukan atau akses ditolak.');

    return this.prisma.order.findMany({
      where: { merchantId: myMerchant.id },
      include: {
        gig: true,
        client: { select: { fullName: true, email: true } },
      },
    });
  }

  async acceptOrder(orderId: number, userId: number) {
    const myMerchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [
          { userId: userId },
          {
            associates: {
              some: {
                userId: userId,
                permission: {
                  in: [
                    AssociatePermission.MANAGE_ORDERS,
                    AssociatePermission.FULL_ACCESS,
                  ],
                },
              },
            },
          },
        ],
      },
    });

    if (!myMerchant)
      throw new NotFoundException('Toko tidak ditemukan atau akses ditolak.');

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId: myMerchant.id },
    });

    if (!order)
      throw new NotFoundException('Pesanan tidak ditemukan di toko ini.');
    if (order.status !== OrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Pesanan belum dikonfirmasi pembayarannya atau sudah tidak bisa diterima.',
      );
    }

    return order;
  }

  async completeOrder(orderId: number, clientId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientId: clientId },
    });

    if (!order) {
      throw new NotFoundException(
        'Pesanan tidak ditemukan atau bukan milik Anda.',
      );
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Pesanan belum dikirim oleh vendor, tidak bisa diselesaikan.',
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COMPLETED },
      });

      const nettPayout = order.totalAmount.sub(order.adminFee);

      await prisma.merchant.update({
        where: { id: order.merchantId },
        data: {
          pendingBalance: { decrement: nettPayout },
          walletBalance: { increment: nettPayout },
        },
      });

      await this.upgradeBadgeIfEligible(order.merchantId, prisma);

      return updatedOrder;
    });
  }

  async declineOrder(orderId: number, userId: number) {
    const myMerchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [
          { userId: userId },
          {
            associates: {
              some: {
                userId: userId,
                permission: {
                  in: [
                    AssociatePermission.MANAGE_ORDERS,
                    AssociatePermission.FULL_ACCESS,
                  ],
                },
              },
            },
          },
        ],
      },
    });

    if (!myMerchant)
      throw new NotFoundException('Toko tidak ditemukan atau akses ditolak.');

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId: myMerchant.id },
    });

    if (!order)
      throw new NotFoundException('Pesanan tidak ditemukan di toko ini.');
    if (order.status !== OrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Pesanan hanya bisa ditolak saat statusnya IN_PROGRESS.',
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDED },
      });

      const nettPayout = order.totalAmount.sub(order.adminFee);
      await prisma.merchant.update({
        where: { id: order.merchantId },
        data: { pendingBalance: { decrement: nettPayout } },
      });

      return updatedOrder;
    });
  }

  async cancelOrder(orderId: number, clientId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientId },
    });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan.');

    if (order.status === OrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Pesanan yang sedang dalam proses tidak dapat dibatalkan secara mandiri. Hubungi Customer Service.',
      );
    }
    if (order.status !== OrderStatus.UNPAID) {
      throw new BadRequestException(
        'Pesanan hanya bisa dibatalkan jika belum dibayar.',
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });
  }

  async uploadPaymentProof(
    orderId: number,
    clientId: number,
    file: Express.Multer.File,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientId },
    });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan.');
    if (order.status !== OrderStatus.UNPAID) {
      throw new BadRequestException(
        'Pesanan ini sudah dibayar atau sedang diproses.',
      );
    }

    const url = await this.supabase.uploadFile(file, 'payment-proofs');
    return this.payOrder(orderId, clientId, url);
  }

  private async upgradeBadgeIfEligible(merchantId: number, tx: any) {
    const merchant = await tx.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) return;

    const completedCount = await tx.order.count({
      where: { merchantId, status: OrderStatus.COMPLETED },
    });

    const avgRatingResult = await tx.review.aggregate({
      _avg: { rating: true },
      where: { order: { merchantId } },
    });
    const avgRating = avgRatingResult._avg.rating ?? 0;

    let newBadge: MerchantBadge | null = null;

    if (
      completedCount >= 25 &&
      avgRating >= 4.5 &&
      merchant.badge !== MerchantBadge.SIGNATURE_PARTNER
    ) {
      newBadge = MerchantBadge.SIGNATURE_PARTNER;
    } else if (
      completedCount >= 10 &&
      avgRating >= 4.0 &&
      merchant.badge === MerchantBadge.RISING_STAR
    ) {
      newBadge = MerchantBadge.STAR_VENDOR;
    } else if (
      completedCount >= 5 &&
      merchant.badge === MerchantBadge.NEWCOMER
    ) {
      newBadge = MerchantBadge.RISING_STAR;
    }

    if (newBadge) {
      await tx.merchant.update({
        where: { id: merchantId },
        data: { badge: newBadge },
      });
    }
  }

  @Cron('0 * * * *')
  async autoAcceptDeliveredOrders() {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const overdueOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { lte: cutoff },
      },
    });

    for (const order of overdueOrders) {
      await this.prisma.$transaction(async (prisma) => {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.COMPLETED },
        });

        const nettPayout = order.totalAmount.sub(order.adminFee);

        await prisma.merchant.update({
          where: { id: order.merchantId },
          data: {
            pendingBalance: { decrement: nettPayout },
            walletBalance: { increment: nettPayout },
          },
        });

        await this.upgradeBadgeIfEligible(order.merchantId, prisma);
      });
    }
  }

  async getOrderDetail(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        gig: true,
        merchant: true,
        client: { select: { fullName: true, email: true } },
        deliverables: true,
      },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan.');
    if (order.clientId === userId) {
      return order;
    }
    if (order.merchant.userId === userId) {
      return order;
    }

    const associate = await this.prisma.merchantAssociate.findFirst({
      where: {
        merchantId: order.merchant.id,
        userId: userId,
        permission: {
          in: [
            AssociatePermission.MANAGE_ORDERS,
            AssociatePermission.FULL_ACCESS,
          ],
        },
      },
    });
    if (associate) {
      return order;
    }

    if (!associate) {
      throw new UnauthorizedException(
        'Anda bukan pemilik toko atau associate yang memiliki akses ke pesanan ini.',
      );
    }
  }
}
