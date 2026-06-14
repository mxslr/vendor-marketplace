import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MerchantStatus,
  MerchantBadge,
  GigStatus,
  DisputeStatus,
  NotificationType,
  OrderStatus,
  Role,
} from '@prisma/client';
import { DisputeDecision } from './enum/dispute.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { GetMerchantsFilterDto } from './dto/get-merchants.dto';

export enum ExecutiveDecisionType {
  FORCE_REFUND = 'FORCE_REFUND',
  FORCE_RELEASE = 'FORCE_RELEASE',
}

@Injectable()
export class AdminValidatorService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getPendingDisputes() {
    return this.prisma.dispute.findMany({
      where: { status: DisputeStatus.OPEN },
      include: {
        order: {
          include: {
            client: { select: { fullName: true, email: true } },
            gig: { select: { title: true } },
          },
        },
      },
    });
  }

  async submitVerdict(
    adminId: number,
    disputeId: number,
    decision: DisputeDecision,
  ) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (
      !admin ||
      (admin.role !== Role.ADMIN_VALIDATOR && admin.role !== Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException('Akses ditolak.');
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });
    if (!dispute)
      throw new NotFoundException('Tiket sengketa tidak ditemukan.');
    if (
      dispute.status !== DisputeStatus.OPEN &&
      dispute.status !== DisputeStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        'Sengketa ini sudah ditutup atau diputuskan.',
      );
    }
    if (
      decision !== DisputeDecision.APPROVE_REFUND &&
      decision !== DisputeDecision.REJECT_COMPLAINT
    ) {
      throw new BadRequestException('Keputusan tidak valid.');
    }

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        pendingVerdict: decision,
        status: DisputeStatus.UNDER_REVIEW,
        validatorId: adminId,
      },
    });

    return {
      message:
        'Verdict telah disiapkan. Panggil confirm-verdict untuk mengeksekusi.',
      disputeId,
      pendingVerdict: decision,
    };
  }

  async confirmVerdict(adminId: number, disputeId: number) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (
      !admin ||
      (admin.role !== Role.ADMIN_VALIDATOR && admin.role !== Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException('Akses ditolak.');
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    });
    if (!dispute)
      throw new NotFoundException('Tiket sengketa tidak ditemukan.');
    if (dispute.status !== DisputeStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        'Sengketa tidak dalam status UNDER_REVIEW. Panggil submit-verdict terlebih dahulu.',
      );
    }
    const pendingVerdict: string | null =
      (dispute as any).pendingVerdict ?? null;
    if (!pendingVerdict) {
      throw new BadRequestException(
        'Tidak ada verdict yang menunggu konfirmasi.',
      );
    }

    const decision = pendingVerdict as DisputeDecision;
    let newOrderStatus;
    if (decision === DisputeDecision.APPROVE_REFUND) {
      newOrderStatus = OrderStatus.REFUND_APPROVED_WAITING_FINANCE;
    } else if (decision === DisputeDecision.REJECT_COMPLAINT) {
      newOrderStatus = OrderStatus.RELEASE_APPROVED_WAITING_FINANCE;
    } else {
      throw new BadRequestException('Keputusan tersimpan tidak valid.');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedDispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          pendingVerdict: null,
        },
      });

      await prisma.order.update({
        where: { id: dispute.orderId },
        data: { status: newOrderStatus },
      });

      await this.notifications.createForRole(
        Role.ADMIN_FINANCE,
        NotificationType.DISPUTE_RESOLVED,
        'Sengketa Menunggu Eksekusi Finance',
        `Sengketa untuk pesanan #${dispute.orderId} telah dikonfirmasi. Status: ${newOrderStatus}. Silakan eksekusi.`,
        JSON.stringify({ orderId: dispute.orderId }),
      );

      return updatedDispute;
    });
  }

  async resolveDispute(
    adminId: number,
    disputeId: number,
    decision: DisputeDecision,
  ) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (
      !admin ||
      (admin.role !== Role.ADMIN_VALIDATOR && admin.role !== Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException('Akses ditolak.');
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    });
    if (!dispute)
      throw new NotFoundException('Tiket sengketa tidak ditemukan.');
    if (
      dispute.status !== DisputeStatus.OPEN &&
      dispute.status !== DisputeStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        'Sengketa ini sudah ditutup atau diputuskan.',
      );
    }

    let newOrderStatus;
    if (decision === DisputeDecision.APPROVE_REFUND) {
      newOrderStatus = OrderStatus.REFUND_APPROVED_WAITING_FINANCE;
    } else if (decision === DisputeDecision.REJECT_COMPLAINT) {
      newOrderStatus = OrderStatus.RELEASE_APPROVED_WAITING_FINANCE;
    } else {
      throw new BadRequestException('Keputusan tidak valid.');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedDispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          validatorId: admin.id,
        },
      });

      await prisma.order.update({
        where: { id: dispute.orderId },
        data: { status: newOrderStatus },
      });

      // NOT-05: notify Finance Admins that a dispute verdict is waiting for execution
      await this.notifications.createForRole(
        Role.ADMIN_FINANCE,
        NotificationType.DISPUTE_RESOLVED,
        'Sengketa Menunggu Eksekusi Finance',
        `Sengketa untuk pesanan #${dispute.orderId} telah diputuskan. Status: ${newOrderStatus}. Silakan eksekusi.`,
        JSON.stringify({ orderId: dispute.orderId }),
      );

      return updatedDispute;
    });
  }

  async getPendingMerchants() {
    return this.prisma.merchant.findMany({
      where: { status: MerchantStatus.PENDING_VERIFICATION },
      include: { user: { select: { fullName: true, email: true } } },
    });
  }

  async getMerchants(query: GetMerchantsFilterDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const status = query.status || 'ALL';

    const skip = (page - 1) * limit;
    const take = limit;

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status as MerchantStatus;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.merchant.findMany({
        where: whereClause,
        skip,
        take,
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchant.count({ where: whereClause }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        lastPage,
        limit,
      },
    };
  }

  async verifyMerchant(
    merchantId: number,
    isApproved: boolean,
    rejectionReason?: string,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');
    if (merchant.status !== MerchantStatus.PENDING_VERIFICATION) {
      throw new BadRequestException(
        'Toko ini tidak sedang dalam antrean verifikasi.',
      );
    }

    if (!isApproved && !rejectionReason) {
      throw new BadRequestException(
        'Alasan penolakan wajib diisi jika menolak verifikasi toko.',
      );
    }

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: isApproved ? MerchantStatus.ACTIVE : MerchantStatus.REJECTED,
        rejectionReason: isApproved ? null : rejectionReason,
        // BAD-01: Explicitly confirm NEWCOMER badge on approval
        ...(isApproved && { badge: MerchantBadge.NEWCOMER }),
      },
    });
  }

  async getPendingGigs() {
    return this.prisma.gig.findMany({
      where: { status: GigStatus.PENDING_APPROVAL },
      include: {
        merchant: { select: { shopName: true } },
        category: { select: { name: true } },
      },
    });
  }

  async verifyGig(
    gigId: number,
    isApproved: boolean,
    rejectionReason?: string,
  ) {
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
      include: { merchant: true, category: true },
    });
    if (!gig) {
      throw new NotFoundException('Jasa tidak ditemukan.');
    }
    if (
      gig.merchant.status !== MerchantStatus.ACTIVE ||
      gig.status !== GigStatus.PENDING_APPROVAL
    ) {
      throw new ForbiddenException(
        'Toko jasa ini belum aktif atau sedang dalam antrian',
      );
    }
    if (!isApproved && !rejectionReason) {
      throw new BadRequestException(
        'Alasan penolakan wajib diisi jika menolak jasa.',
      );
    }
    return this.prisma.gig.update({
      where: { id: gigId },
      data: {
        status: isApproved ? GigStatus.ACTIVE : GigStatus.REJECTED,
        rejectionReason: isApproved ? null : rejectionReason,
      },
    });
  }
  async executiveDecision(
    adminId: number,
    orderId: number,
    decision: ExecutiveDecisionType,
  ) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Hanya Super Admin yang bisa membuat Executive Decision.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan.');
    if (order.status !== OrderStatus.DISPUTE_IN_PROGRESS) {
      throw new BadRequestException(
        'Executive Decision hanya bisa dilakukan pada pesanan berstatus DISPUTE_IN_PROGRESS.',
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      if (decision === ExecutiveDecisionType.FORCE_REFUND) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.REFUNDED },
        });

        const nettPayout = order.totalAmount.sub(order.adminFee);
        await prisma.merchant.update({
          where: { id: order.merchantId },
          data: { pendingBalance: { decrement: nettPayout } },
        });
      } else if (decision === ExecutiveDecisionType.FORCE_RELEASE) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.COMPLETED },
        });

        const nettPayout = order.totalAmount.sub(order.adminFee);
        await prisma.merchant.update({
          where: { id: order.merchantId },
          data: {
            pendingBalance: { decrement: nettPayout },
            walletBalance: { increment: nettPayout },
          },
        });
      } else {
        throw new BadRequestException('Tipe keputusan tidak valid.');
      }

      await prisma.dispute.updateMany({
        where: { orderId, status: { not: DisputeStatus.CLOSED } },
        data: { status: DisputeStatus.CLOSED },
      });

      return { message: `Executive Decision ${decision} berhasil dieksekusi.` };
    });
  }

  async suspendMerchant(
    isSuspended: boolean,
    merchantId: number,
    reason?: string,
    days?: number,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    const allowedForSuspend: MerchantStatus[] = [
      MerchantStatus.ACTIVE,
      MerchantStatus.VACATION,
    ];
    if (isSuspended && !allowedForSuspend.includes(merchant.status)) {
      throw new BadRequestException(
        'Hanya toko dengan status ACTIVE atau VACATION yang bisa disuspend.',
      );
    }

    if (isSuspended && !reason) {
      throw new BadRequestException('Alasan suspend wajib diisi.');
    }

    const suspensionDays = days ? Number(days) : 0;
    const suspendedUntil =
      isSuspended && suspensionDays > 0
        ? new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000)
        : null;

    return this.prisma.$transaction(async (prisma) => {
      const updatedMerchant = await prisma.merchant.update({
        where: { id: merchantId },
        data: {
          status: isSuspended
            ? MerchantStatus.SUSPENDED
            : MerchantStatus.ACTIVE,
          rejectionReason: isSuspended ? reason : null,
          suspendedUntil: suspendedUntil,
        },
      });

      await prisma.user.update({
        where: { id: merchant.userId },
        data: { isSuspended: isSuspended },
      });

      return updatedMerchant;
    });
  }

  async suspendUser(
    adminId: number,
    isSuspended: boolean,
    userId: number,
    reason?: string,
    days?: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { merchant: true },
    });

    if (!user) throw new NotFoundException('User tidak ditemukan.');

    if (user.merchant) {
      return this.suspendMerchant(isSuspended, user.merchant.id, reason, days);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: isSuspended },
    });
  }
}
