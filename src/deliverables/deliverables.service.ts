import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationType,
  OrderStatus,
  AssociatePermission,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DeliverablesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async submitDeliverable(
    userId: number,
    orderId: number,
    fileUrl: string,
    message?: string,
  ) {
    const merchant = await this.prisma.merchant.findFirst({
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

    if (!merchant)
      throw new NotFoundException('Toko tidak ditemukan atau akses ditolak.');

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, merchantId: merchant.id },
    });

    if (!order)
      throw new NotFoundException('Pesanan tidak ditemukan di toko ini.');

    if (
      order.status !== OrderStatus.IN_PROGRESS &&
      order.status !== OrderStatus.IN_REVISION
    ) {
      throw new BadRequestException(
        'Pesanan tidak dalam status pengerjaan atau revisi.',
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      const deliverable = await prisma.orderDeliverable.create({
        data: {
          orderId: order.id,
          fileUrl: fileUrl,
          message: message,
          submittedBy: userId,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
      });

      // NOT-02: notify client that order has been delivered
      await this.notifications.create(
        order.clientId,
        NotificationType.ORDER_DELIVERED,
        'Hasil Pekerjaan Telah Dikirim',
        `Vendor telah mengirimkan hasil pekerjaan untuk pesanan #${order.id}. Silakan periksa dan terima atau ajukan revisi.`,
        JSON.stringify({ orderId: order.id }),
      );

      return deliverable;
    });
  }
}
