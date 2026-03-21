import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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

    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
    });

    if (!gig) throw new NotFoundException('Gig not found');

    if (gig.merchantId !== userId) {
      throw new ForbiddenException('Not your gig');
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
      throw new BadRequestException('Already promoted');
    }

    return this.prisma.featuredPlacement.create({
      data: {
        merchantId: userId,
        gigId,
        durationDays,
        amount: basePrice,
        status: FeaturedPaymentStatus.PENDING_VERIFICATION,
      },
    });
  }

  async uploadProof(userId: number, featureId: number, proofUrl: string) {
    const feature = await this.prisma.featuredPlacement.findUnique({
      where: { id: featureId },
    });

    if (!feature) throw new NotFoundException();

    if (feature.merchantId !== userId) {
      throw new ForbiddenException();
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
    return this.prisma.featuredPlacement.findMany({
      where: { merchantId: userId },
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

    if (!feature) throw new NotFoundException();

    if (feature.status === FeaturedPaymentStatus.ACTIVE) {
      throw new BadRequestException('Already approved');
    }

    if (!feature.proofUrl) {
      throw new BadRequestException('Proof required');
    }

    const gig = await this.prisma.gig.findUnique({
      where: { id: feature.gigId },
    });

    if (!gig) throw new NotFoundException();

    const now = new Date();

    let endDate = new Date();
    endDate.setDate(now.getDate() + feature.durationDays);

    // 🔥 extend kalau masih aktif
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

    return { message: 'Feature activated' };
  }

  async rejectFeature(featureId: number) {
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

    await this.prisma.gig.updateMany({
      where: {
        featuredStatus: FeaturedStatus.FEATURED,
        featuredUntil: { lt: now },
      },
      data: {
        featuredStatus: FeaturedStatus.NONE,
        featuredUntil: null,
      },
    });
  }
}