import { Test, TestingModule } from '@nestjs/testing';
import { FeaturedPlacementService } from './featured-placements.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FeaturedPaymentStatus, FeaturedStatus } from '@prisma/client';

describe('FeaturedPlacementService', () => {
  let service: FeaturedPlacementService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(async () => {
    prisma = {
      merchant: {
        findUnique: jest.fn(),
      } as any,
      gig: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      } as any,
      featuredPlacement: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      } as any,
      $transaction: jest.fn((promises) => Promise.all(promises)) as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturedPlacementService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FeaturedPlacementService>(FeaturedPlacementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPromote', () => {
    it('should create a promotion successfully', async () => {
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.gig.findUnique as jest.Mock).mockResolvedValue({ id: 10, merchantId: 1 });
      (prisma.featuredPlacement.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.featuredPlacement.create as jest.Mock).mockResolvedValue({ id: 100 });

      const res = await service.createPromote(1, 10);
      expect(res).toEqual({ id: 100 });
      expect(prisma.featuredPlacement.create).toHaveBeenCalledWith({
        data: {
          merchantId: 1,
          gigId: 10,
          durationDays: 3,
          amount: 50000,
          status: FeaturedPaymentStatus.PENDING_VERIFICATION,
        },
      });
    });

    it('should throw NotFoundException if merchant not found', async () => {
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.createPromote(1, 10)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if feature already active', async () => {
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.gig.findUnique as jest.Mock).mockResolvedValue({ id: 10, merchantId: 1 });
      (prisma.featuredPlacement.findFirst as jest.Mock).mockResolvedValue({ id: 100 });

      await expect(service.createPromote(1, 10)).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadProof', () => {
    it('should update proofUrl', async () => {
      (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.featuredPlacement.findUnique as jest.Mock).mockResolvedValue({
        id: 100, merchantId: 1, status: FeaturedPaymentStatus.PENDING_VERIFICATION
      });
      (prisma.featuredPlacement.update as jest.Mock).mockResolvedValue({ id: 100, proofUrl: 'url' });

      const res = await service.uploadProof(1, 100, 'url');
      expect(res).toEqual({ id: 100, proofUrl: 'url' });
    });
  });

  describe('approveFeature', () => {
    it('should approve feature and update gig', async () => {
      (prisma.featuredPlacement.findUnique as jest.Mock).mockResolvedValue({
        id: 100, status: FeaturedPaymentStatus.PENDING_VERIFICATION, proofUrl: 'url', gigId: 10, durationDays: 3
      });
      (prisma.gig.findUnique as jest.Mock).mockResolvedValue({ id: 10 });

      const res = await service.approveFeature(100);
      expect(res).toEqual({ message: 'Featured sudah aktif' });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('rejectFeature', () => {
    it('should reject feature', async () => {
      (prisma.featuredPlacement.findUnique as jest.Mock).mockResolvedValue({
        id: 100, status: FeaturedPaymentStatus.PENDING_VERIFICATION
      });
      (prisma.featuredPlacement.update as jest.Mock).mockResolvedValue({ id: 100, status: FeaturedPaymentStatus.REJECTED });

      const res = await service.rejectFeature(100);
      expect(res).toEqual({ id: 100, status: FeaturedPaymentStatus.REJECTED });
    });
  });

  describe('expireFeatured', () => {
    it('should expire features', async () => {
      await service.expireFeatured();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.featuredPlacement.updateMany).toHaveBeenCalled();
      expect(prisma.gig.updateMany).toHaveBeenCalled();
    });
  });
});
