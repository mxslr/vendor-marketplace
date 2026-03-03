import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssociatePermission, Role } from '@prisma/client';

@Injectable()
export class MerchantAssociatesService {
  constructor(private prisma: PrismaService) {}

  async addAssociate(
    ownerUserId: number,
    targetEmail: string,
    permission: AssociatePermission,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: ownerUserId },
    });
    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    const targetUser = await this.prisma.user.findUnique({
      where: { email: targetEmail },
    });
    if (!targetUser)
      throw new NotFoundException(
        'User dengan email tersebut tidak terdaftar di sistem.',
      );

    if (targetUser.id === ownerUserId) {
      throw new BadRequestException(
        'Anda tidak bisa menambahkan diri sendiri sebagai associate.',
      );
    }

    const existing = await this.prisma.merchantAssociate.findUnique({
      where: {
        merchantId_userId: { merchantId: merchant.id, userId: targetUser.id },
      },
    });
    if (existing)
      throw new BadRequestException(
        'User ini sudah menjadi staf di toko Anda.',
      );

    return this.prisma.$transaction(async (prisma) => {
      if (targetUser.role === Role.CLIENT) {
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { role: Role.MERCHANT_ASSOCIATE },
        });
      }

      return prisma.merchantAssociate.create({
        data: {
          merchantId: merchant.id,
          userId: targetUser.id,
          permission: permission,
        },
      });
    });
  }

  async getMyAssociates(ownerUserId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: ownerUserId },
    });
    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    return this.prisma.merchantAssociate.findMany({
      where: { merchantId: merchant.id },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });
  }
}
