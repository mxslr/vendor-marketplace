import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  FeaturedPaymentStatus,
  FeaturedStatus,
} from '@prisma/client';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class FeaturedPlacementService {
  constructor(private prisma: PrismaService) {}

  // =========================
  // 🟢 MERCHANT
  // =========================

  async createPromote(userId: number, gigId: number) {
    const basePrice = 50000;
    const durationDays = 3;

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      const associate = await this.prisma.merchantAssociate.findFirst({ where: { userId } });
      if (associate) {
        throw new ForbiddenException('Staf (Associate) tidak diizinkan untuk membeli Featured Placement.');
      }
      throw new NotFoundException('Toko tidak ditemukan');
    }

    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
    });

    if (!gig) throw new NotFoundException('Jasa tidak ditemukan');

    if (gig.merchantId !== merchant.id) {
      throw new ForbiddenException('Jasa ini bukan milikmu');
    }

    const existing = await this.prisma.featuredPlacement.findFirst({
      where: {
        gigId,
        status: {
          in: [
            FeaturedPaymentStatus.PENDING_VERIFICATION,
            FeaturedPaymentStatus.ACTIVE,
          ],
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Feature sudah aktif atau sedang berada di tahap verifikasi');
    }

    return this.prisma.featuredPlacement.create({
      data: {
        merchantId: merchant.id,
        gigId,
        durationDays,
        amount: basePrice,
        status: FeaturedPaymentStatus.PENDING_VERIFICATION,
      },
    });
  }

  async uploadProof(userId: number,featureId: number, proofUrl: string) {

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) throw new NotFoundException('Toko tidak ditemukan');


    const feature = await this.prisma.featuredPlacement.findUnique({
      where: { id: featureId },
    });

    if (!feature) throw new NotFoundException('Feature tidak ditemukan');

    if (feature.merchantId !== merchant.id) {
      throw new ForbiddenException('Unauthorized');
    }

    if (feature.status !== FeaturedPaymentStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Invalid status');
    }

    return this.prisma.featuredPlacement.update({
      where: { id: featureId },
      data: { proofUrl },
    });
  }

  async getMyPromotes(userId: number) {

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) throw new NotFoundException('Toko tidak ditemukan');

    return this.prisma.featuredPlacement.findMany({
      where: { merchantId: merchant.id},
      include: { gig: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================
  // 🔵 ADMIN
  // =========================

  async approveFeature(featureId: number) {
    const feature = await this.prisma.featuredPlacement.findUnique({
      where: { id: featureId },
    });

    if (!feature) throw new NotFoundException('Feature tidak ditemukan');

    if (feature.status !== FeaturedPaymentStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Feature tidak sedang berada di tahap verifikasi');
    }

    if (!feature.proofUrl) {
      throw new BadRequestException('Upload bukti pembayaran dibutuhkan');
    }

    const gig = await this.prisma.gig.findUnique({
      where: { id: feature.gigId },
    });

    if (!gig) throw new NotFoundException('Jasa tidak ditemukan');

    const now = new Date();

    let endDate = new Date();
    endDate.setDate(now.getDate() + feature.durationDays);

    //  extend kalau masih aktif
    if (gig.featuredUntil && gig.featuredUntil > now) {
      endDate = new Date(gig.featuredUntil);
      endDate.setDate(endDate.getDate() + feature.durationDays);
    }

    await this.prisma.$transaction([
      this.prisma.featuredPlacement.update({
        where: { id: featureId },
        data: {
          status: FeaturedPaymentStatus.ACTIVE,
          startDate: now,
          endDate,
        },
      }),
      this.prisma.gig.update({
        where: { id: feature.gigId },
        data: {
          featuredStatus: FeaturedStatus.FEATURED,
          featuredUntil: endDate,
        },
      }),
    ]);

    return { message: 'Featured sudah aktif' };
  }

  async rejectFeature(featureId: number) {

  const feature = await this.prisma.featuredPlacement.findUnique({
    where: { id: featureId },
  });

  if (!feature) {
    throw new NotFoundException('Feature tidak ditemukan');
  }

  if (feature.status !== FeaturedPaymentStatus.PENDING_VERIFICATION) {
    throw new BadRequestException('Tidak bisa menolak feature ini karena tidak sedang berada di tahap verifikasi');
  }

    return this.prisma.featuredPlacement.update({
      where: { id: featureId },
      data: {
        status: FeaturedPaymentStatus.REJECTED,
      },
    });
  }

  async getPendingFeatures() {
    return this.prisma.featuredPlacement.findMany({
      where: {
        status: FeaturedPaymentStatus.PENDING_VERIFICATION,
      },
      include: {
        gig: true,
        merchant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================
  // ⏳ CRON
  // =========================

  @Cron('0 0 * * *')
  async expireFeatured() {
    const now = new Date();

    await this.prisma.$transaction([
       this.prisma.featuredPlacement.updateMany({
        where: {
          status: FeaturedPaymentStatus.ACTIVE,
          endDate: { lt: now },
        },
        data: {
          status: FeaturedPaymentStatus.EXPIRED,
        },
      }),

      this.prisma.gig.updateMany({
        where: {
          featuredStatus: FeaturedStatus.FEATURED,
          featuredUntil: { lt: now },
        },
        data: {
          featuredStatus: FeaturedStatus.NONE,
          featuredUntil: null,
        },
      }),
    ]);
  }
}