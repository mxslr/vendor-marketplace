import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGigDto } from './gigs.dto';
import { GigStatus, MerchantStatus } from '@prisma/client';

@Injectable()
export class GigsService {
  constructor(private prisma: PrismaService) {}

  // Endpoint untuk merchant(vendor) membuat jasa baru. Saat dibuat, status jasa langsung jadi PENDING_APPROVAL, nanti admin yang akan approve supaya statusnya jadi ACTIVE dan bisa dilihat pembeli.
  async createGig(userId: number, dto: CreateGigDto) {
    const myMerchant = await this.prisma.merchant.findUnique({
      where: { userId: userId },
    });

    if (!myMerchant) {
      throw new NotFoundException('Kamu belum punya toko. Bikin toko dulu ya.');
    }
    if (myMerchant.status !== MerchantStatus.ACTIVE) {
      throw new ForbiddenException(
        'Toko kamu belum aktif. Jasa hanya bisa dibuat jika toko sudah ACTIVE.',
      );
    }

    return this.prisma.gig.create({
      data: {
        merchantId: myMerchant.id,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        mediaUrls: dto.mediaUrls,
        status: GigStatus.PENDING_APPROVAL, // Status awal saat dibuat, menunggu approval admin
      },
    });
  }

  async approveGig(gigId: number) {
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
      include: { merchant: true },
    });
    if (!gig) {
      throw new NotFoundException('Jasa tidak ditemukan.');
    }
    if (gig.merchant.status !== MerchantStatus.ACTIVE) {
      throw new ForbiddenException('Toko jasa ini belum aktif.');
    }
    return this.prisma.gig.update({
      where: { id: gigId },
      data: { status: GigStatus.ACTIVE },
    });
  }

  async rejectGig(gigId: number, reason: string) {
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
      include: { merchant: true },
    });
    if (!gig) {
      throw new NotFoundException('Jasa tidak ditemukan.');
    }
    if (gig.merchant.status !== MerchantStatus.ACTIVE) {
      throw new ForbiddenException('Toko jasa ini belum aktif.');
    }
    return this.prisma.gig.update({
      where: { id: gigId },
      data: { status: GigStatus.REJECTED, rejectionReason: reason },
    });
  }
  // Untuk endpoint listing jasa, kita hanya menampilkan jasa dengan status ACTIVE dan dari merchant yang statusnya ACTIVE juga. Jadi kita pastikan hanya jasa yang sudah disetujui dan dari toko yang sudah aktif yang bisa dilihat pembeli.
  async findAllActiveGigs() {
    return this.prisma.gig.findMany({
      where: { status: GigStatus.ACTIVE },
      include: {
        merchant: {
          select: {
            shopName: true,
            user: { select: { fullName: true } },
          },
        },
        category: true,
      },
    });
  }
  // Endpoint untuk merchant(vendor) melihat jasa-jasa yang dia buat, termasuk yang belum aktif
  async findMyGigs(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });
    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    return this.prisma.gig.findMany({
      where: { merchantId: merchant.id },
    });
  }
}
