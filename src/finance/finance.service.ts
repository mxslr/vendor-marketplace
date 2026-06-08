import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getProfileActivityLog(userId: number) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        key: true,
        newValue: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const { fullName, email } = dto;
    const updateData: any = {};

    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Email sudah terdaftar.');
      }
      updateData.email = normalizedEmail;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Tidak ada data profil yang diubah.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isSuspended: true,
        createdAt: true,
      },
    });

    return {
      sub: updatedUser.id,
      ...updatedUser,
    };
  }
}
