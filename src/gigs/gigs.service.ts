import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGigDto, PromoteGigDto } from './gigs.dto';
import { GigStatus, MerchantStatus } from '@prisma/client';

@Injectable()
export class GigsService {
  constructor(private prisma: PrismaService) {}

  // Endpoint untuk merchant(vendor) membuat jasa baru. Saat dibuat, status jasa langsung jadi PENDING_APPROVAL, nanti admin yang akan approve supaya statusnya jadi ACTIVE dan bisa dilihat pembeli.
  async createGig(userId: number,  dto: CreateGigDto) {
    const myMerchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!myMerchant) {
      throw new NotFoundException('Kamu belum punya toko. Bikin toko dulu ya.');
    }
    if ( myMerchant.status === MerchantStatus.SUSPENDED || myMerchant.status !== MerchantStatus.ACTIVE) {
      throw new ForbiddenException(
        'Toko kamu belum aktif atau kemungkinan sedang disuspend.',
      );
    }

    return this.prisma.gig.create({
      data: {
        merchantId: dto.merchantId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        mediaUrls: dto.mediaUrls,
        status: GigStatus.PENDING_APPROVAL, // Set status awal jadi PENDING_APPROVAL, nanti admin yang akan approve
      },
    });
  }
  
  // Untuk endpoint listing jasa, kita hanya menampilkan jasa dengan status ACTIVE dan dari merchant yang statusnya ACTIVE juga. Jadi kita pastikan hanya jasa yang sudah disetujui dan dari toko yang sudah aktif yang bisa dilihat pembeli.
  async findAllActiveGigs() {
    return this.prisma.gig.findMany({
      where: { status: GigStatus.ACTIVE },
      include: {
        merchant: {
          select: {
            shopName: true,
            user: { select: { fullName: true } },
          },
        },
        category: true,
      },
    });
  }
  // Endpoint untuk merchant(vendor) melihat jasa-jasa yang dia buat, termasuk yang belum aktif
  async findMyGigs(userId: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });
    if (!merchant) throw new NotFoundException('Toko tidak ditemukan.');

    return this.prisma.gig.findMany({
      where: { merchantId: merchant.id},
    });
  }

  // Endpoint untuk Melihat detail gigs di masing masing merchant
  async detailGigs(gigId: number){
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId},
      include: {
        merchant: true,
      }
    });
    if (!gig) {
      throw new NotFoundException('Jasa tidak ditemukan.');
    }
    if (gig.status !== GigStatus.ACTIVE) {
      throw new  NotFoundException('Jasa tidak ditemukan atau belum aktif')
    }
    return gig;
  }

  async promoteGig(userId: number, dto: PromoteGigDto) {
    const gig = await this.prisma.gig.findUnique({
      where: { id: dto.gigId },
      include: { merchant: true },
    });
    if (!gig) {
      throw new NotFoundException('Jasa tidak ditemukan.');
    }
    if (gig.merchant.userId !== userId) {
      throw new ForbiddenException('ini bukan jasa milikmu.');
    }
    if (gig.status !== GigStatus.ACTIVE) {
      throw new ForbiddenException('Hanya bisa dilakukan pada gig/postingan yang statusnya ACTIVE.');
    }

    const basePrice = 50000; // Harga dasar untuk promosi, bisa disesuaikan
    const baseDuration = 3; // Durasi dasar dalam hari untuk harga dasar

    // Hitung harga promosi berdasarkan durasi yang dipilih
    const promotionPrice = (dto.durationDays / baseDuration);
    const amountToPay = basePrice * promotionPrice;

    if(dto.paymentMethod === 'WALLET') {
      // opsi A: bayar pakai wallet di aplikasi

      if(Number(gig.merchant.walletBalance) < amountToPay) {
        throw new ForbiddenException('Saldo wallet tidak cukup untuk promosi ini.');
      }
      // Gunakan saldo wallet untuk bayar promosi
      return this.prisma.$transaction(async (tx) => {
        // Kurangi saldo wallet merchant
        await tx.merchant.update({
          where: { id: gig.merchantId },
          data: {
            walletBalance: {
              decrement: amountToPay,
            }
          },
        });
        const placement = await tx.featuredPlacement.create({
          data: {
            merchantId: gig.merchant.id,
            gigId: gig.id,
            durationDays: dto.durationDays,
            amount: amountToPay,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + dto.durationDays * 24 * 60 * 60 * 1000), // Hitung tanggal berakhir berdasarkan durasi
          },
        });

        await tx.gig.update({
          where: { id: gig.id },
          data: { status: GigStatus.FEATURED },
        });

        return placement;          
      });

    }else {
      // opsi B: bayar pakai transfer bank (manual)
      // Di sini kita hanya buat record featured placement dengan status PENDING_PAYMENT, nanti admin yang akan cek pembayaran manualnya dan approve promosi ini
      return this.prisma.featuredPlacement.create({
        data: {
          merchantId: gig.merchant.id,
          gigId: gig.id,
          durationDays: dto.durationDays,
          amount: amountToPay,
          status: 'PENDING_PAYMENT', 
          startDate: null, // Nanti diisi saat admin approve setelah cek pembayaran
          endDate: null, // Nanti diisi saat admin approve setelah cek pembayaran
        },
      });
    }
  }
}
