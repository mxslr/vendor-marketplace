import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGigDto, UpdateGigDto } from './gigs.dto';
import { AssociatePermission, GigStatus, MerchantStatus } from '@prisma/client';

@Injectable()
export class GigsService {
  constructor(private prisma: PrismaService) {}

  async createGig(userId: number, dto: CreateGigDto) {
    let merchantId: number;

    const ownerMerchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (ownerMerchant) {
      if (ownerMerchant.status !== MerchantStatus.ACTIVE) {
        throw new ForbiddenException(
          'Toko kamu belum aktif atau kemungkinan sedang disuspend.',
        );
      }
      merchantId = ownerMerchant.id;
    } else {
      const associate = await this.prisma.merchantAssociate.findFirst({
        where: {
          userId,
          permission: {
            in: [
              AssociatePermission.MANAGE_GIGS,
              AssociatePermission.FULL_ACCESS,
            ],
          },
        },
        include: { merchant: true },
      });
      if (!associate) {
        throw new ForbiddenException(
          'Akses ditolak. Kamu tidak memiliki toko atau izin untuk membuat jasa.',
        );
      }
      if (associate.merchant.status !== MerchantStatus.ACTIVE) {
        throw new ForbiddenException(
          'Toko tempat kamu bernaung belum aktif atau sedang disuspend.',
        );
      }
      merchantId = associate.merchantId;
    }

    const categoryExist = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!categoryExist) {
      throw new NotFoundException('Kategori tidak ditemukan.');
    }

    return this.prisma.gig.create({
      data: {
        merchantId: merchantId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        plan: dto.plan,
        price: dto.price,
        mediaUrls: dto.mediaUrls,
        status: GigStatus.PENDING_APPROVAL,
      },
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
      orderBy: [
        { featuredStatus: 'desc' },
        { featuredUntil: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }
  // Endpoint untuk merchant(vendor) melihat jasa-jasa yang dia buat, termasuk yang belum aktif
  async findMyGigs(userId: number) {
    let merchantId: number | null = null;

    const ownerMerchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (ownerMerchant) {
      merchantId = ownerMerchant.id;
    } else {
      const associate = await this.prisma.merchantAssociate.findFirst({
        where: { userId },
      });
      if (associate) {
        merchantId = associate.merchantId;
      }
    }

    if (!merchantId) throw new NotFoundException('Toko tidak ditemukan.');

    return this.prisma.gig.findMany({
      where: { merchantId: merchantId },
    });
  }

  // Endpoint untuk Melihat detail gigs di masing masing merchant
  async detailGigs(gigId: number, userPayload?: any) {
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
      include: {
        merchant: {
          select: {
            id: true,
            userId: true,
            shopName: true,
            description: true,
            logoUrl: true,
            bannerUrl: true,
            badge: true,
            createdAt: true,
          },
        },
      },
    });

    if (!gig) {
      throw new NotFoundException('Jasa tidak ditemukan.');
    }

    if (gig.status === GigStatus.ACTIVE || gig.status === GigStatus.FEATURED) {
      return gig;
    }

    if (userPayload) {
      const userId = Number(userPayload.sub);
      if (gig.merchant && gig.merchant.userId === userId) {
        return gig;
      }

      const associate = await this.prisma.merchantAssociate.findFirst({
        where: {
          userId: userId,
          merchantId: gig.merchantId,
        },
      });
      if (associate) {
        return gig;
      }
    }

    throw new NotFoundException('Jasa tidak ditemukan atau belum aktif');
  }

  async updateGig(userId: number, gigId: number, dto: UpdateGigDto) {
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
      include: { merchant: true },
    });

    if (!gig) {
      throw new NotFoundException('Gig tidak ditemukan.');
    }

    // Verify ownership: owner or associate with permission
    const isOwner = gig.merchant.userId === userId;
    if (!isOwner) {
      const associate = await this.prisma.merchantAssociate.findFirst({
        where: {
          userId,
          merchantId: gig.merchantId,
          permission: {
            in: [
              AssociatePermission.MANAGE_GIGS,
              AssociatePermission.FULL_ACCESS,
            ],
          },
        },
      });
      if (!associate) {
        throw new ForbiddenException(
          'Akses ditolak. Kamu tidak memiliki izin untuk mengubah jasa ini.',
        );
      }
    }

    // Determine final status
    let finalStatus = gig.status;
    if (dto.status === GigStatus.DRAFT) {
      finalStatus = GigStatus.DRAFT;
    } else if (dto.title || dto.description || dto.price !== undefined || dto.mediaUrls) {
      // Content changed → re-approve needed
      finalStatus = GigStatus.PENDING_APPROVAL;
    }

    return this.prisma.gig.update({
      where: { id: gigId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.mediaUrls !== undefined && { mediaUrls: dto.mediaUrls }),
        ...(dto.plan !== undefined && { plan: dto.plan }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        status: finalStatus,
      },
    });
  }

  async removeGigs(gigId: number) {
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
    });

    if (!gig) {
      throw new NotFoundException('Gig tidak ditemukan');
    }

    return this.prisma.gig.update({
      where: { id: gigId },
      data: { status: GigStatus.REMOVED },
    });
  }
}
