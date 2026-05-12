import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MerchantStatus,
  GigStatus,
  DisputeStatus,
  OrderStatus,
  Role,
} from '@prisma/client';
import { DisputeDecision } from './enum/dispute.enum';

@Injectable()
export class AdminValidatorService {
  constructor(private prisma: PrismaService) {}

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

      return updatedDispute;
    });
  }

  async getPendingMerchants() {
    return this.prisma.merchant.findMany({
      where: { status: MerchantStatus.PENDING_VERIFICATION },
      include: { user: { select: { fullName: true, email: true } } },
    });
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

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: isSuspended ? MerchantStatus.SUSPENDED : MerchantStatus.ACTIVE,
        rejectionReason: isSuspended ? reason : null,
        suspendedUntil: suspendedUntil,
      },
    });
  }
}
