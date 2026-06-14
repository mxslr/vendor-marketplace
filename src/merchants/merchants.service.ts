import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma, MerchantStatus, NotificationType, Role } from '@prisma/client';
import {
  SubmitKybDto,
  UpdateProfileDto,
  RegisterMerchantUserDto,
} from './merchants.dto';
import { InternalServerErrorException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MerchantsService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notifications: NotificationsService,
  ) {}

  async registerNewMerchant(dto: RegisterMerchantUserDto) {
    const {
      email,
      password,
      fullName,
      shopName,
      description,
      logoUrl,
      bannerUrl,
      bankName,
      accountNumber,
      accountHolderName,
    } = dto;
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('Email sudah terdaftar');
    }

    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      return await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: hashedPassword,
            fullName: fullName,
            role: Role.MERCHANT_OWNER,
          },
        });

        // 2. Buat Toko (Merchant) untuk user tersebut
        const newMerchant = await tx.merchant.create({
          data: {
            userId: newUser.id,
            shopName: shopName,
            description: description,
            logoUrl: logoUrl,
            bannerUrl: bannerUrl,
          },
        });

        const newBankAccount = await tx.bankAccount.create({
          data: {
            merchantId: newMerchant.id,
            bankName: bankName,
            accountNumber: accountNumber,
            accountHolderName: accountHolderName,
          },
        });

        const { passwordHash, isSuspended, ...userWithoutPassword } = newUser;

        const payload = {
          sub: newUser.id,
          email: newUser.email,
          role: newUser.role,
        };
        const token = await this.jwtService.signAsync(payload);

        return {
          access_token: token,
          token_type: 'Bearer',
          user: userWithoutPassword,
          merchant: newMerchant,
          bankAccount: newBankAccount,
          status: MerchantStatus.INCOMPLETE,
        };
      });
    } catch (error) {
      console.error('Detail Error Server:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Terjadi kesalahan pada input database');
      }
      throw new InternalServerErrorException(
        'Maaf, terjadi masalah internal pada server kami',
      );
    }
  }

  // Endpoint: POST /merchants/kyb - Submit dokumen KYB untuk verifikasi toko
  async submitKyb(userId: number, dto: SubmitKybDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: userId },
    });

    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    if (merchant.status !== MerchantStatus.INCOMPLETE) {
      throw new BadRequestException(
        'Pengajuan KYB hanya bisa dilakukan dari status INCOMPLETE. Jika ditolak, gunakan endpoint acknowledge-rejection terlebih dahulu.',
      );
    }

    const kybDataString = JSON.stringify({
      kybDocumentUrl: dto.kybDocumentUrl,
      portfolioUrl: dto.portfolioUrl,
    });
    const updated = await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        kybDocuments: kybDataString,
        status: MerchantStatus.PENDING_VERIFICATION,
        rejectionReason: null,
      },
    });

    // NOT-07: notify Validators of new KYB submission
    await this.notifications.createForRole(
      Role.ADMIN_VALIDATOR,
      NotificationType.KYB_APPROVED,
      'Pengajuan KYB Baru',
      `Toko "${merchant.shopName}" mengajukan verifikasi KYB. Silakan tinjau dokumen.`,
      JSON.stringify({ merchantId: merchant.id }),
    );

    return updated;
  }
  async acknowledgeKybRejection(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    if (merchant.status !== MerchantStatus.REJECTED) {
      throw new BadRequestException(
        'Hanya toko dengan status REJECTED yang dapat melakukan acknowledge rejection.',
      );
    }

    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: { status: MerchantStatus.INCOMPLETE },
    });
  }

  async findAllMerchants() {
    return this.prisma.merchant.findMany({
      where: {
        status: { in: [MerchantStatus.ACTIVE, MerchantStatus.VACATION] },
      },
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
    const updateData: any = {
      shopName: dto.shopName,
      description: dto.description,
      logoUrl: dto.logoUrl,
      bannerUrl: dto.bannerUrl,
    };

    if (dto.withdrawalPin !== undefined) {
      updateData.withdrawalPin = await bcrypt.hash(dto.withdrawalPin, 10);
    }

    const updated = await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: updateData,
    });
    const { withdrawalPin, ...safeResult } = updated;
    return safeResult;
  }

  // Untuk profil sendiri (lewat token)
  async findMyMerchantByUserId(userId: number) {
    let isAssociate = false;
    let merchant = await this.prisma.merchant.findUnique({
      where: { userId: userId },
      include: {
        bankAccounts: true,
        gigs: true,
      },
    });

    if (!merchant) {
      const associate = await this.prisma.merchantAssociate.findFirst({
        where: { userId },
        include: {
          merchant: {
            include: { bankAccounts: true, gigs: true },
          },
        },
      });

      if (associate) {
        merchant = associate.merchant;
        isAssociate = true;
      }
    }

    if (!merchant)
      throw new NotFoundException(
        'Kamu belum memiliki toko atau tidak berafiliasi dengan toko manapun.',
      );

    const viewableStatuses: MerchantStatus[] = [
      MerchantStatus.ACTIVE,
      MerchantStatus.VACATION,
    ];
    if (!viewableStatuses.includes(merchant.status)) {
      throw new BadRequestException(
        'Kamu tidak dapat mengakses profil toko selama masa suspend atau verifikasi.',
      );
    }

    if (isAssociate) {
      // Hide wallet balances for associates; signal canBoost: false so frontend disables the Boost button
      const { walletBalance, pendingBalance, withdrawalPin, ...safeMerchant } =
        merchant;
      return { ...safeMerchant, canBoost: false };
    }

    return { ...merchant, canBoost: true };
  }

  // Untuk profil publik (lewat URL param)
  async findMerchantById(merchantId: number) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        id: merchantId,
        status: { in: [MerchantStatus.ACTIVE, MerchantStatus.VACATION] },
      },
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
    const allowedStatus: MerchantStatus[] = [
      MerchantStatus.ACTIVE,
      MerchantStatus.VACATION,
    ];

    if (!allowedStatus.includes(merchant.status)) {
      throw new BadRequestException(
        'Hanya toko terverifikasi yang dapat mengubah mode liburan.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const newStatus = isOnVacation
        ? MerchantStatus.VACATION
        : MerchantStatus.ACTIVE;

      await tx.merchant.update({
        where: { id: merchant.id },
        data: { status: newStatus },
      });

      await tx.gig.updateMany({
        where: { merchantId: merchant.id },
        data: {
          status: isOnVacation ? 'PAUSED' : 'ACTIVE',
        },
      });
      return {
        message: isOnVacation
          ? 'Toko berhasil ditutup sementara (Mode Liburan Aktif)'
          : 'Toko berhasil dibuka kembali (Mode Liburan Non-Aktif)',
        status: newStatus,
      };
    });
  }

  async getLeaderboard() {
    const [mostBooked, bestRating, fastestResponse] = await Promise.all([
      // most_booked: top 10 merchants by COMPLETED order count
      this.prisma.order
        .groupBy({
          by: ['merchantId'],
          where: { status: 'COMPLETED' },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        })
        .then(async (rows) => {
          const merchants = await this.prisma.merchant.findMany({
            where: { id: { in: rows.map((r) => r.merchantId) } },
            select: { id: true, shopName: true, logoUrl: true, badge: true },
          });
          return rows.map((r) => ({
            merchant: merchants.find((m) => m.id === r.merchantId),
            completedOrders: r._count.id,
          }));
        }),

      // best_rating: top 10 merchants by average review rating (min 1 review)
      this.prisma.$queryRaw<
        { merchantId: number; avgRating: number; reviewCount: number }[]
      >`
        SELECT o."merchantId"::int, AVG(r.rating)::float AS "avgRating", COUNT(r.id)::int AS "reviewCount"
        FROM "Review" r
        JOIN "Order" o ON r."orderId" = o.id
        GROUP BY o."merchantId"
        HAVING COUNT(r.id) >= 1
        ORDER BY "avgRating" DESC, "reviewCount" DESC
        LIMIT 10
      `.then(async (rows) => {
        const merchants = await this.prisma.merchant.findMany({
          where: { id: { in: rows.map((r) => r.merchantId) } },
          select: { id: true, shopName: true, logoUrl: true, badge: true },
        });
        return rows.map((r) => ({
          merchant: merchants.find((m) => m.id === r.merchantId),
          avgRating: Number(r.avgRating).toFixed(2),
          reviewCount: r.reviewCount,
        }));
      }),

      // fastest_response: top 10 merchants by avg time (order created → first deliverable)
      this.prisma.$queryRaw<
        { merchantId: number; avgResponseSeconds: number }[]
      >`
        SELECT o."merchantId"::int,
               AVG(EXTRACT(EPOCH FROM (d."minCreatedAt" - o."createdAt")))::float AS "avgResponseSeconds"
        FROM "Order" o
        JOIN (
          SELECT "orderId", MIN("createdAt") AS "minCreatedAt"
          FROM "OrderDeliverable"
          GROUP BY "orderId"
        ) d ON d."orderId" = o.id
        WHERE o.status = 'COMPLETED'
        GROUP BY o."merchantId"
        ORDER BY "avgResponseSeconds" ASC
        LIMIT 10
      `.then(async (rows) => {
        const merchants = await this.prisma.merchant.findMany({
          where: { id: { in: rows.map((r) => r.merchantId) } },
          select: { id: true, shopName: true, logoUrl: true, badge: true },
        });
        return rows.map((r) => ({
          merchant: merchants.find((m) => m.id === r.merchantId),
          avgResponseHours: (Number(r.avgResponseSeconds) / 3600).toFixed(1),
        }));
      }),
    ]);

    return { mostBooked, bestRating, fastestResponse };
  }

  async closeMerchant(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new NotFoundException('Toko tidak ditemukan.');
    }

    if (merchant.status !== MerchantStatus.ACTIVE) {
      throw new BadRequestException('Hanya toko aktif yang bisa menutup toko');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.merchant.update({
        where: { id: merchant.id },
        data: { status: MerchantStatus.CLOSED },
      });

      await tx.gig.updateMany({
        where: { merchantId: merchant.id },
        data: { status: 'REMOVED' },
      });
    });
  }
}
