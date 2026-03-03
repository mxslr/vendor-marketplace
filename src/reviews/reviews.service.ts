import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(
    clientId: number,
    orderId: number,
    rating: number,
    comment?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientId: clientId },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan.');
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Hanya pesanan yang sudah selesai yang bisa di-review.',
      );
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { orderId: orderId },
    });
    if (existingReview)
      throw new BadRequestException(
        'Anda sudah memberikan ulasan untuk pesanan ini.',
      );

    return this.prisma.review.create({
      data: {
        orderId: order.id,
        clientId: clientId,
        rating: rating,
        comment: comment,
      },
    });
  }
}
