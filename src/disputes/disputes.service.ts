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
}
