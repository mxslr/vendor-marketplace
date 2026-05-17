import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppealStatus, NotificationType, OrderStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AppealsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async createAppeal(requesterId: number, orderId: number, reason: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan.');

    const isClient = order.clientId === requesterId;
    const merchant = await this.prisma.merchant.findFirst({
      where: { userId: requesterId },
    });
    const isMerchant = merchant && order.merchantId === merchant.id;

    if (!isClient && !isMerchant) {
      throw new ForbiddenException('Anda tidak memiliki akses ke pesanan ini.');
    }

    const appealableStatuses: OrderStatus[] = [
      OrderStatus.REFUND_APPROVED_WAITING_FINANCE,
      OrderStatus.RELEASE_APPROVED_WAITING_FINANCE,
      OrderStatus.REFUNDED,
      OrderStatus.COMPLETED,
    ];
    if (!appealableStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Banding hanya bisa diajukan setelah keputusan sengketa ditetapkan.',
      );
    }

    const existing = await this.prisma.appeal.findFirst({
      where: { orderId, requesterId },
    });
    if (existing) {
      throw new BadRequestException('Anda sudah mengajukan banding untuk pesanan ini.');
    }

    const appeal = await this.prisma.appeal.create({
      data: { orderId, requesterId, reason },
    });

    // NOT-08: notify Super Admins of new appeal
    await this.notifications.createForRole(
      Role.SUPER_ADMIN,
      NotificationType.APPEAL_RECEIVED,
      'Banding Baru Diterima',
      `Pengguna mengajukan banding untuk pesanan #${orderId}. Silakan tinjau.`,
      JSON.stringify({ appealId: appeal.id, orderId }),
    );

    return appeal;
  }

  async getAppeals(adminId: number) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Hanya Super Admin yang dapat melihat semua banding.');
    }

    return this.prisma.appeal.findMany({
      include: {
        order: { select: { id: true, status: true, totalAmount: true } },
        requester: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveAppeal(
    adminId: number,
    appealId: number,
    resolution: string,
    isApproved: boolean,
  ) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Hanya Super Admin yang dapat memutuskan banding.');
    }

    const appeal = await this.prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) throw new NotFoundException('Banding tidak ditemukan.');
    if (appeal.status !== AppealStatus.PENDING && appeal.status !== AppealStatus.UNDER_REVIEW) {
      throw new BadRequestException('Banding ini sudah diselesaikan.');
    }

    return this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: isApproved ? AppealStatus.APPROVED : AppealStatus.REJECTED,
        resolvedBy: adminId,
        resolution,
        resolvedAt: new Date(),
      },
    });
  }
}
