import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGigDto} from './gigs.dto';
import { FeaturedStatus, GigStatus, MerchantStatus } from '@prisma/client';

@Injectable()
export class GigsService {
  constructor(private prisma: PrismaService) {}

  // Endpoint untuk merchant(vendor) membuat jasa baru. Saat dibuat, status jasa langsung jadi PENDING_APPROVAL, nanti admin yang akan approve supaya statusnya jadi ACTIVE dan bisa dilihat pembeli.
  async createGig(userId: number,  dto: CreateGigDto) {
    const myMerchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!myMerchant) {
      throw new NotFoundException('Kamu belum punya toko. Bikin toko dulu ya.');
    }
    if ( myMerchant.status === MerchantStatus.SUSPENDED || myMerchant.status !== MerchantStatus.ACTIVE) {
      throw new ForbiddenException(
        'Toko kamu belum aktif atau kemungkinan sedang disuspend.',
      );
    }

    return this.prisma.gig.create({
      data: {
        merchantId: dto.merchantId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        mediaUrls: dto.mediaUrls,
        status: GigStatus.PENDING_APPROVAL, // Set status awal jadi PENDING_APPROVAL, nanti admin yang akan approve
      },
    });
  }
  
  // Untuk endpoint listing jasa, kita hanya menampilkan jasa dengan status ACTIVE dan dari merchant yang statusnya ACTIVE juga. Jadi kita pastikan hanya jasa yang sudah disetujui dan dari toko yang sudah aktif yang bisa dilihat pembeli.
  async findAllActiveGigs() {
    return this.prisma.gig.findMany({
      where: { status: GigStatus.ACTIVE, OR: [
        { featuredStatus: FeaturedStatus.FEATURED, featuredUntil: { gte: new Date()}},
        { featuredStatus: FeaturedStatus.NONE}
      ]},
      include: {
        merchant: {
          select: {
            shopName: true,
            user: { select: { fullName: true } },
          },
        },
        category: true,
      },
      orderBy: [
        { featuredStatus: 'desc'},
        { featuredUntil: 'desc'},
        { createdAt: 'desc'}
      ]
    });
  }
  // Endpoint untuk merchant(vendor) melihat jasa-jasa yang dia buat, termasuk yang belum aktif
  async findMyGigs(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });
    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    return this.prisma.gig.findMany({
      where: { merchantId: merchant.id},
    });
  }

  // Endpoint untuk Melihat detail gigs di masing masing merchant
  async detailGigs(gigId: number){
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId},
      include: {
        merchant: true,
      }
    });
    if (!gig) {
      throw new NotFoundException('Jasa tidak ditemukan.');
    }
    if (gig.status !== GigStatus.ACTIVE) {
      throw new  NotFoundException('Jasa tidak ditemukan atau belum aktif')
    }
    return gig;
  }

  async removeGigs(gigId: number) {
    const gig = await this.prisma.gig.findUnique({
      where : { id : gigId}
    });

    if (!gig) {
      throw new NotFoundException('Gig tidak ditemukan');
    }

    return this.prisma.gig.update({
      where : { id : gigId},
      data: { status : GigStatus.REMOVED}
    })
  }
}
