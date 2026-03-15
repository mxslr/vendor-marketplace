import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MerchantStatus, Role } from '@prisma/client';
import {
  CreateMerchantDto,
  SubmitKybDto,
  UpdateProfileDto,
} from './merchants.dto';

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}
  // Endpoint: POST /merchants - Membuat toko baru (Hanya 1 toko per user)
  async createMerchant(userId: number,  dto: CreateMerchantDto) {
    const existingMerchant = await this.prisma.merchant.findUnique({
      where: { userId: userId  },
    });

    if (existingMerchant) {
      throw new BadRequestException(
        'Akun ini sudah memiliki toko. Satu akun hanya bisa membuat satu toko.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
    // Update role di tabel User
    await tx.user.update({
      where: { id: userId },
      data: { role: Role.MERCHANT_OWNER },
    });

    return tx.merchant.create({
      data: {
        userId: userId,
        shopName: dto.shopName,
        description: dto.description,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        status: MerchantStatus.INCOMPLETE, // Status awal saat membuat toko, menunggu pengisian KYB
      },
      });
    });
  }
  
  // Endpoint: POST /merchants/kyb - Submit dokumen KYB untuk verifikasi toko
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
    return this.prisma.merchant.findMany({
      where: { status: MerchantStatus.ACTIVE }, // Hanya tampilkan toko yang sudah aktif
    });
  }
  // Endpoint: PATCH /merchants/profile - Update profil toko (Hanya untuk merchant itu sendiri)
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
        bannerUrl: dto.bannerUrl, // Pastikan status tetap ACTIVE setelah update profil
      },
    });
  }

  // Untuk profil sendiri (lewat token)
  async findMyMerchantByUserId(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: userId },
      include: {
        bankAccounts: true, 
        gigs: true,
      },
    });
    if (!merchant) throw new NotFoundException('Kamu belum memiliki toko.')
    if (merchant.status !== MerchantStatus.ACTIVE) {
      throw new BadRequestException(
        'kamu tidak dapat berjualan selama masa suspend atau verifikasi!',
      );
    }
    return merchant;
  }

  // Untuk profil publik (lewat URL param)
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
        gigs: {
          where: { status: 'ACTIVE' }, 
        },
      },
    });

    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    return merchant;  
  } 
  
  async toggleVacationMode(userId: number, isOnVacation: boolean) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });
    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');
    if (merchant.status !== MerchantStatus.ACTIVE) {
      throw new BadRequestException(
        'Hanya toko terverifikasi yang dapat mengubah mode liburan.',
      );
    }
    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: { status: isOnVacation ? MerchantStatus.VACATION : MerchantStatus.ACTIVE }
      });
    }

  async closeMerchant(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId }
    });

    if (!merchant) {
      throw new NotFoundException('Toko tidak ditemukan.')
    }

    if (merchant.status !== MerchantStatus.ACTIVE) {
      throw new BadRequestException(
        'Hanya toko aktif yang bisa menutup toko'
      )
    }

      return this.prisma.merchant.update({
        where: { id: merchant.id },
        data: { status: MerchantStatus.CLOSED }
      })
    }
  }

