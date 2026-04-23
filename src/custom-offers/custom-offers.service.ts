import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { StreamService } from 'src/chat/stream.service';

@Injectable()
export class CustomOffersService {
  constructor(private prisma: PrismaService, private streamService: StreamService ) {}

  async createOffer(userId: number, clientId: number, channelId: string, data: any) {
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

    const offer = await this.prisma.customOffer.create({
      data: {
        merchantId: merchant.id,
        clientId,
        gigId:data.gigId,
        title: data.title,
        description: data.description,
        price: data.price,
        deadlineDays: data.deadlineDays,
        status: 'PENDING',
      },
    });

    await this.streamService.sendOfferAttachment(channelId, userId.toString(), {
    offerId: offer.id,
    gigId: offer.gigId,
    price: offer.price,
    title: offer.title
  });
  return offer
  }

  async getClientOffers(clientId: number) {
    return this.prisma.customOffer.findMany({
      where: { clientId },
      include: { merchant: { select: { shopName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptOffer(offerId: number, clientId: number, messageId: string) {
    const offer = await this.prisma.customOffer.findUnique({ where: { id: offerId }, include: { gig: true} });

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
          gigId: offer.gigId,
          customOfferId: offer.id,
          totalAmount: offer.price,
          status: 'UNPAID', 
        },
      });

      await this.streamService.updateOfferStatus(messageId, 'ACCEPTED');

      return { 
        message: 'Penawaran berhasil diterima, tagihan sudah dibuat', 
        offer: updatedOffer,
        order: newOrder 
      };
    });
  }

  async rejectOffer(offerId: number, clientId: number, messageId: string) {
    const offer = await this.prisma.customOffer.findUnique({ where: { id: offerId } });

    if (!offer || offer.clientId !== clientId) {
      throw new NotFoundException('Penawaran tidak ditemukan');
    }
    
    const updateOffer= await this.prisma.customOffer.update({
      where: { id: offerId },
      data: { status: 'REJECTED' },
    });

    await this.streamService.updateOfferStatus(messageId, 'REJECTED');

    return {
      message: 'Penawaran berhasil ditolak',
      offer: updateOffer
    }
  }
}