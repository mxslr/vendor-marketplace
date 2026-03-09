import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  OrderStatus, 
  AssociatePermission, 
  TransactionType, 
  TransactionStatus 
} from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(clientId: number, gigId: number) {
    const gig = await this.prisma.gig.findUnique({ where: { id: gigId } });
    if (!gig) throw new NotFoundException('Layanan tidak ditemukan.');

    return this.prisma.order.create({
      data: {
        clientId: clientId,
        merchantId: gig.merchantId,
        gigId: gig.id,
        totalAmount: gig.price,
      },
    });
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
          proofUrl: proofUrl || "https://dummy-bukti-transfer.jpg",
        },
      });

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
    if (order.status !== OrderStatus.PAID_PENDING_CONFIRMATION) {
      throw new BadRequestException(
        'Pesanan belum dibayar atau sudah diproses.',
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.IN_PROGRESS },
    });
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

      await prisma.merchant.update({
        where: { id: order.merchantId },
        data: {
          walletBalance: { increment: order.totalAmount },
        },
      });

      return updatedOrder;
    });
  }
}