import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MerchantStatus } from '@prisma/client';
import {
  CreateMerchantDto,
  SubmitKybDto,
  UpdateProfileDto,
} from './merchants.dto';

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}
  // Endpoint: POST /merchants 
  async createMerchant(userId: number, dto: CreateMerchantDto) {
    const existingMerchant = await this.prisma.merchant.findUnique({
      where: { userId: userId },
    });

    if (existingMerchant) {
      throw new BadRequestException(
        'Akun ini sudah memiliki toko. Satu akun hanya bisa membuat satu toko.',
      );
    }

    return this.prisma.merchant.create({
      data: {
        userId: userId,
        shopName: dto.shopName,
        description: dto.description,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        status: MerchantStatus.INCOMPLETE, 
      },
    });
  }

  async submitKyb(userId: number, dto: SubmitKybDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: userId },
    });

    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    if (merchant.status !== 'INCOMPLETE' && merchant.status !== 'REJECTED') {
      throw new BadRequestException(
        'Toko sudah diverifikasi atau sedang dalam antrean.',
      );
    }
    const kybDataString = JSON.stringify({
      kybDocumentUrl: dto.kybDocumentUrl,
      portfolioUrl: dto.portfolioUrl,
    });
    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        kybDocuments: kybDataString,
        status: MerchantStatus.PENDING_VERIFICATION,
        rejectionReason: null,
      },
    });
  }
  async findAllMerchants() {
    return this.prisma.merchant.findMany();
  }
  async approveMerchant(merchantId: number) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: MerchantStatus.ACTIVE },
    });
  }
  async rejectMerchant(merchantId: number) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: MerchantStatus.REJECTED,
        rejectionReason: null,
      },
    });
  }

  async updateProfileMerchant(userId: number, dto: UpdateProfileDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });
    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');
    if (merchant.status !== MerchantStatus.ACTIVE) {
      throw new BadRequestException(
        'Hanya toko terverifikasi yang dapat diupdate profilnya.',
      );
    }
    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        shopName: dto.shopName,
        description: dto.description,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
      },
    });
  }

  async findMerchantByUserId(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: userId },
      include: {
        bankAccounts: true, 
        gigs: true,
      },
    });

    if (!merchant) throw new NotFoundException('Kamu belum memiliki toko.');
    return merchant;
  }
  async findMerchantById(merchantId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId, status: MerchantStatus.ACTIVE }, 
      select: {
        id: true,
        userId: true,
        shopName: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        status: true,
        badge: true,
        createdAt: true,

        gigs: {
          where: { status: 'ACTIVE' }, 
        },
      },
    });

    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    return merchant;
  }
}
