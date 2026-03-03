import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, DisputeStatus, Role } from '@prisma/client';

@Injectable()
export class DisputesService {
  constructor(private prisma: PrismaService) {}

  async openDispute(
    clientId: number,
    orderId: number,
    reason: string,
    evidenceUrls?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientId: clientId },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan.');

    const allowedStatuses = [
      OrderStatus.IN_PROGRESS,
      OrderStatus.DELIVERED,
      OrderStatus.IN_REVISION,
    ];
    if (!allowedStatuses.includes(order.status as any)) {
      throw new BadRequestException(
        'Status pesanan ini tidak dapat disengketakan.',
      );
    }

    const existingDispute = await this.prisma.dispute.findUnique({
      where: { orderId: orderId },
    });
    if (existingDispute)
      throw new BadRequestException('Sengketa untuk pesanan ini sudah dibuka.');

    return this.prisma.$transaction(async (prisma) => {
      const dispute = await prisma.dispute.create({
        data: {
          orderId: order.id,
          reason: reason,
          evidenceUrls: evidenceUrls,
          status: DisputeStatus.OPEN,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DISPUTE_IN_PROGRESS },
      });

      return dispute;
    });
  }

  async resolveDispute(
    adminId: number,
    disputeId: number,
    decision: 'APPROVE_REFUND' | 'REJECT_COMPLAINT',
    verdictNote: string,
  ) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (
      !admin ||
      (admin.role !== Role.ADMIN_VALIDATOR && admin.role !== Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException('Akses ditolak.');
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    });
    if (!dispute)
      throw new NotFoundException('Tiket sengketa tidak ditemukan.');
    if (
      dispute.status !== DisputeStatus.OPEN &&
      dispute.status !== DisputeStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        'Sengketa ini sudah ditutup atau diputuskan.',
      );
    }

    let newOrderStatus;
    if (decision === 'APPROVE_REFUND') {
      newOrderStatus = OrderStatus.REFUND_APPROVED_WAITING_FINANCE;
    } else if (decision === 'REJECT_COMPLAINT') {
      newOrderStatus = OrderStatus.RELEASE_APPROVED_WAITING_FINANCE;
    } else {
      throw new BadRequestException('Keputusan tidak valid.');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedDispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          validatorId: admin.id,
          verdictNote: verdictNote,
        },
      });

      await prisma.order.update({
        where: { id: dispute.orderId },
        data: { status: newOrderStatus },
      });

      return updatedDispute;
    });
  }
}
