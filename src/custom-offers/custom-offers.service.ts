import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable()
export class CustomOffersService {
  constructor(private prisma: PrismaService) {}

  async createOffer(userId: number, clientId: number, data: any) {
    let merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      const associate = await this.prisma.merchantAssociate.findFirst({
        where: { userId },
        include: { merchant: true },
      });
      if (associate) {
        merchant = associate.merchant;
      }
    }

    if (!merchant) {
      throw new BadRequestException('Anda tidak memiliki akses merchant untuk membuat penawaran.');
    }

    return this.prisma.customOffer.create({
      data: {
        merchantId: merchant.id,
        clientId,
        title: data.title,
        description: data.description,
        price: data.price,
        deadlineDays: data.deadlineDays,
        status: 'PENDING',
      },
    });
  }

  async getClientOffers(clientId: number) {
    return this.prisma.customOffer.findMany({
      where: { clientId },
      include: { merchant: { select: { shopName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptOffer(offerId: number, clientId: number) {
    const offer = await this.prisma.customOffer.findUnique({ where: { id: offerId } });

    if (!offer || offer.clientId !== clientId) {
      throw new NotFoundException('Penawaran tidak ditemukan atau bukan hak aksesmu');
    }
    if (offer.status !== 'PENDING') {
      throw new BadRequestException(`Gagal, penawaran ini sudah berstatus ${offer.status}`);
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedOffer = await prisma.customOffer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED' },
      });

      const newOrder = await prisma.order.create({
        data: {
          clientId: offer.clientId,
          merchantId: offer.merchantId,
          customOfferId: offer.id,
          totalAmount: offer.price,
          status: 'UNPAID', 
        },
      });

      return { 
        message: 'Penawaran berhasil diterima, tagihan sudah dibuat', 
        offer: updatedOffer,
        order: newOrder 
      };
    });
  }

  async rejectOffer(offerId: number, clientId: number) {
    const offer = await this.prisma.customOffer.findUnique({ where: { id: offerId } });

    if (!offer || offer.clientId !== clientId) {
      throw new NotFoundException('Penawaran tidak ditemukan');
    }

    return this.prisma.customOffer.update({
      where: { id: offerId },
      data: { status: 'REJECTED' },
    });
  }
}