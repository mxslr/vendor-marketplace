import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, TransactionStatus } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  private async checkAdminRole(userId: number, allowedRoles: Role[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.',
      );
    }
  }

  async findMyTransactions(userId: number) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: { 
        order: { select: { id: true, totalAmount: true, status: true } } 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(userId: number) {
    await this.checkAdminRole(userId, [Role.SUPER_ADMIN, Role.ADMIN_FINANCE]);
    return this.prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        user: { select: { fullName: true, email: true } } 
      }
    });
  }

  async verifyTransaction(adminId: number, transactionId: number, status: TransactionStatus) {
    await this.checkAdminRole(adminId, [Role.SUPER_ADMIN, Role.ADMIN_FINANCE]);

    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
      throw new NotFoundException(`Transaksi dengan ID ${transactionId} tidak ditemukan`);
    }

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status,
        verifiedBy: adminId,
      },
    });
  }
}