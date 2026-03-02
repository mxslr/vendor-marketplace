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
  // Endpoint: POST /merchants - Membuat toko baru (Hanya 1 toko per user)
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
        status: MerchantStatus.INCOMPLETE, // Status awal saat membuat toko, menunggu pengisian KYB
        bankAccounts: {
          create: {
            bankName: dto.bankName,
            accountNumber: dto.accountNumber,
            accountHolderName: dto.accountHolderName,
            isPrimary: true,
          },
        },
      },
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
    // Simpan data KYB sebagai JSON string di database
    const kybDataString = JSON.stringify({
      kybDocumentUrl: dto.kybDocumentUrl,
      portfolioUrl: dto.portfolioUrl,
    });
    // Update KYB documents and set status to PENDING_VERIFICATION for admin review
    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        kybDocuments: kybDataString,
        status: MerchantStatus.PENDING_VERIFICATION,
        rejectionReason: null,
      },
    });
  }
  //  Endpoint: GET /merchants - List semua toko (publik)
  async findAllMerchants() {
    return this.prisma.merchant.findMany();
  }
  // Approval toko oleh admin
  async approveMerchant(merchantId: number) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: MerchantStatus.ACTIVE },
    });
  }
  // Penolakan toko oleh admin dengan alasan
  async rejectMerchant(merchantId: number) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: MerchantStatus.REJECTED,
        rejectionReason: null,
      },
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
        bannerUrl: dto.bannerUrl,
      },
    });
  }

  // Untuk profil sendiri (lewat token)
  async findMerchantByUserId(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: userId },
      include: {
        bankAccounts: true, // Merchant boleh lihat rekeningnya sendiri
        gigs: true,
      },
    });

    if (!merchant) throw new NotFoundException('Kamu belum memiliki toko.');
    return merchant;
  }
  // Untuk profil publik (lewat URL param)
  async findMerchantById(merchantId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId, status: MerchantStatus.ACTIVE }, // Hanya tampilkan toko yang sudah aktif
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
          where: { status: 'ACTIVE' }, // Publik hanya boleh lihat jasa yang sudah ACTIVE
        },
      },
    });

    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    return merchant;
  }
}
