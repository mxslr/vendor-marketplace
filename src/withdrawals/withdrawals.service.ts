import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, WithdrawalStatus } from '@prisma/client';
import { CreateWithdrawalDto, CompleteWithdrawalDto } from './withdrawals.dto';

const MIN_WITHDRAWAL_AMOUNT = 50000;

@Injectable()
export class WithdrawalsService {
  constructor(private prisma: PrismaService) {}

  private async getMerchant(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) {
      throw new ForbiddenException(
        'Akses ditolak. Hanya pemilik merchant yang dapat melakukan penarikan.',
      );
    }
    return merchant;
  }

  private async checkAdminRole(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN_FINANCE] as const;
    if (!user || !allowedRoles.includes(user.role as any)) {
      throw new ForbiddenException('Akses ditolak. Hanya Finance Admin yang dapat mengakses ini.');
    }
    return user;
  }

  async requestWithdrawal(userId: number, dto: CreateWithdrawalDto) {
    const merchant = await this.getMerchant(userId);
    const merchantId = merchant.id;

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: dto.bankAccountId },
    });

    if (!bankAccount || bankAccount.merchantId !== merchantId) {
      throw new NotFoundException('Rekening bank tidak ditemukan atau bukan milik Anda.');
    }

    if (!merchant.withdrawalPin) {
      throw new BadRequestException('PIN penarikan belum diatur. Silakan set PIN terlebih dahulu di profil merchant.');
    }

    if (merchant.withdrawalPin !== dto.pin) {
      throw new BadRequestException('PIN penarikan tidak valid.');
    }

    if (dto.amount < MIN_WITHDRAWAL_AMOUNT) {
      throw new BadRequestException(`Jumlah penarikan minimal adalah Rp ${MIN_WITHDRAWAL_AMOUNT}.`);
    }

    if (merchant.walletBalance.toNumber() < dto.amount) {
      throw new BadRequestException('Saldo wallet tidak mencukupi untuk penarikan ini.');
    }

    return this.prisma.$transaction(async (prisma) => {
      await prisma.merchant.update({
        where: { id: merchantId },
        data: {
          walletBalance: { decrement: dto.amount },
          pendingBalance: { increment: dto.amount },
        },
      });

      return prisma.withdrawal.create({
        data: {
          merchantId,
          bankAccountId: bankAccount.id,
          amount: dto.amount,
          status: WithdrawalStatus.PENDING,
        },
      });
    });
  }

  async findPendingWithdrawals(adminId: number) {
    await this.checkAdminRole(adminId);
    return this.prisma.withdrawal.findMany({
      where: { status: WithdrawalStatus.PENDING },
      include: {
        merchant: { select: { id: true, shopName: true, userId: true } },
        bankAccount: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async completeWithdrawal(adminId: number, withdrawalId: number, dto: CompleteWithdrawalDto) {
    await this.checkAdminRole(adminId);

    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Permintaan penarikan tidak ditemukan.');
    }
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Hanya permintaan dengan status PENDING yang dapat diproses.');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.COMPLETED,
          proofUrl: dto.proofUrl,
          processedBy: adminId,
          completedAt: new Date(),
        },
      });

      await prisma.merchant.update({
        where: { id: withdrawal.merchantId },
        data: {
          pendingBalance: { decrement: withdrawal.amount },
        },
      });

      return updated;
    });
  }

  async rejectWithdrawal(adminId: number, withdrawalId: number) {
    await this.checkAdminRole(adminId);

    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Permintaan penarikan tidak ditemukan.');
    }
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Hanya permintaan dengan status PENDING yang dapat ditolak.');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.REJECTED,
          processedBy: adminId,
          completedAt: new Date(),
        },
      });

      await prisma.merchant.update({
        where: { id: withdrawal.merchantId },
        data: {
          walletBalance: { increment: withdrawal.amount },
          pendingBalance: { decrement: withdrawal.amount },
        },
      });

      return updated;
    });
  }

  async findMyWithdrawals(userId: number) {
    const merchant = await this.getMerchant(userId);
    return this.prisma.withdrawal.findMany({
      where: { merchantId: merchant.id },
      include: { bankAccount: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWithdrawalById(userId: number, withdrawalId: number) {
    const merchant = await this.getMerchant(userId);
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { bankAccount: true },
    });

    if (!withdrawal || withdrawal.merchantId !== merchant.id) {
      throw new NotFoundException('Permintaan penarikan tidak ditemukan.');
    }

    return withdrawal;
  }
}
