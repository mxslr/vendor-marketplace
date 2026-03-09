import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private async checkAdminRole(userId: number, allowedRoles: Role[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.',
      );
    }
  }

  async create(userId: number, data: { name: string; commissionRate: number }) {
    await this.checkAdminRole(userId, [Role.SUPER_ADMIN, Role.ADMIN_VALIDATOR]);
    return this.prisma.category.create({
      data: {
        name: data.name,
        commissionRate: data.commissionRate,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' }, 
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        gigs: {
          where: { status: 'ACTIVE' }, 
          select: { id: true, title: true, price: true, merchant: { select: { shopName: true } } }
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
    }
    return category;
  }

  async update(userId: number, id: number, data: { name?: string; commissionRate?: number }) {
    await this.checkAdminRole(userId, [Role.SUPER_ADMIN]);
    await this.findOne(id); 
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(userId: number, id: number) {
    await this.checkAdminRole(userId, [Role.SUPER_ADMIN]);
    await this.findOne(id);
    return this.prisma.category.delete({
      where: { id },
    });
  }
}