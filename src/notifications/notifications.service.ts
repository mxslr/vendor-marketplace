import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Role } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, type: NotificationType, title: string, message: string, metadata?: string) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, metadata },
    });
  }

  async createForRole(role: Role, type: NotificationType, title: string, message: string, metadata?: string) {
    const users = await this.prisma.user.findMany({ where: { role } });
    await Promise.all(
      users.map((u) => this.create(u.id, type, title, message, metadata)),
    );
  }

  async getMyNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(userId: number, notificationId: number) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
