import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MerchantStatus, Role } from '@prisma/client';

@Injectable()
export class AdminValidatorService {
  constructor(private prisma: PrismaService) {}

  private async checkAdminRole(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      (user.role !== Role.ADMIN_VALIDATOR && user.role !== Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException(
        'Akses ditolak. Area khusus Admin Validator.',
      );
    }
  }

  async getPendingMerchants(userId: number) {
    await this.checkAdminRole(userId);
    return this.prisma.merchant.findMany({
      where: { status: MerchantStatus.PENDING_VERIFICATION },
      include: { user: { select: { fullName: true, email: true } } },
    });
  }

  async verifyMerchant(
    userId: number,
    merchantId: number,
    status: MerchantStatus, 
    rejectionReason?: string,
  ) {
    await this.checkAdminRole(userId);

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');
    if (merchant.status !== MerchantStatus.PENDING_VERIFICATION) {
      throw new BadRequestException(
        'Toko ini tidak sedang dalam antrean verifikasi.',
      );
    }

    if (status === MerchantStatus.REJECTED && !rejectionReason) {
      throw new BadRequestException(
        'Alasan penolakan wajib diisi jika menolak verifikasi toko.',
      );
    }

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: status, 
        rejectionReason: status === MerchantStatus.REJECTED ? rejectionReason : null,
      },
    });
  }
}