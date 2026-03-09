import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BankAccountsService {
  constructor(private prisma: PrismaService) {}

  private async getMerchantOwnerId(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) {
      throw new ForbiddenException('Akses ditolak. Hanya pemilik toko utama yang dapat mengelola rekening bank.');
    }
    return merchant.id;
  }

  async create(userId: number, data: { bankName: string; accountNumber: string; accountHolderName: string; isPrimary?: boolean }) {
    const merchantId = await this.getMerchantOwnerId(userId);

    if (data.isPrimary) {
      await this.prisma.bankAccount.updateMany({
        where: { merchantId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.bankAccount.create({
      data: {
        merchantId,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
        isPrimary: data.isPrimary || false,
      },
    });
  }

  async findAllByMerchant(userId: number) {
    const merchantId = await this.getMerchantOwnerId(userId);
    return this.prisma.bankAccount.findMany({
      where: { merchantId },
      orderBy: { isPrimary: 'desc' }, 
    });
  }

  async update(userId: number, id: number, data: { bankName?: string; accountNumber?: string; accountHolderName?: string; isPrimary?: boolean }) {
    const merchantId = await this.getMerchantOwnerId(userId);
    
    const account = await this.prisma.bankAccount.findFirst({ where: { id, merchantId } });
    if (!account) throw new NotFoundException('Rekening tidak ditemukan atau bukan milik Anda');

    if (data.isPrimary) {
      await this.prisma.bankAccount.updateMany({
        where: { merchantId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data,
    });
  }

  async remove(userId: number, id: number) {
    const merchantId = await this.getMerchantOwnerId(userId);
    const account = await this.prisma.bankAccount.findFirst({ where: { id, merchantId } });
    
    if (!account) throw new NotFoundException('Rekening tidak ditemukan atau bukan milik Anda');

    return this.prisma.bankAccount.delete({ where: { id } });
  }
}