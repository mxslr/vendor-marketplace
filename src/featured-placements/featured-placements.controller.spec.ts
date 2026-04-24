import { Test, TestingModule } from '@nestjs/testing';
import { FeaturedPlacementController } from './featured-placements.controller';
import { FeaturedPlacementService } from './featured-placements.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';

describe('FeaturedPlacementController', () => {
  let controller: FeaturedPlacementController;
  let service: jest.Mocked<Partial<FeaturedPlacementService>>;

  beforeEach(async () => {
    service = {
      createPromote: jest.fn(),
      uploadProof: jest.fn(),
      getMyPromotes: jest.fn(),
      approveFeature: jest.fn(),
      rejectFeature: jest.fn(),
      getPendingFeatures: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeaturedPlacementController],
      providers: [
        { provide: FeaturedPlacementService, useValue: service },
      ],
    })
    .overrideGuard(AuthGuard)
    .useValue({ canActivate: jest.fn(() => true) })
    .compile();

    controller = module.get<FeaturedPlacementController>(FeaturedPlacementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockAdminReq = { user: { sub: 1, role: Role.ADMIN_FINANCE } } as any;
  const mockMerchantReq = { user: { sub: 2, role: Role.MERCHANT_OWNER } } as any;
  const mockUserReq = { user: { sub: 3, role: Role.USER } } as any;

  describe('createPromote', () => {
    it('should call service for valid merchant', async () => {
      service.createPromote.mockResolvedValue({ id: 1 } as any);
      const res = await controller.createPromote(mockMerchantReq, { gigId: 10 });
      expect(service.createPromote).toHaveBeenCalledWith(2, 10);
      expect(res).toEqual({ id: 1 });
    });

    it('should throw Forbidden for non-merchant', async () => {
      await expect(controller.createPromote(mockUserReq, { gigId: 10 }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('uploadProof', () => {
    it('should call service for valid merchant', async () => {
      service.uploadProof.mockResolvedValue({ id: 1 } as any);
      await controller.uploadProof(mockMerchantReq, 1, { proofUrl: 'url' });
      expect(service.uploadProof).toHaveBeenCalledWith(2, 1, 'url');
    });
  });

  describe('getMyPromotes', () => {
    it('should call service for valid merchant', async () => {
      await controller.getMyPromotes(mockMerchantReq);
      expect(service.getMyPromotes).toHaveBeenCalledWith(2);
    });
  });

  describe('Admin actions', () => {
    it('approveFeature should call service for admin', async () => {
      await controller.approveFeature(mockAdminReq, 1);
      expect(service.approveFeature).toHaveBeenCalledWith(1);
    });

    it('rejectFeature should call service for admin', async () => {
      await controller.rejectFeature(mockAdminReq, 1);
      expect(service.rejectFeature).toHaveBeenCalledWith(1);
    });

    it('getPendingFeatures should call service for admin', async () => {
      await controller.getPendingFeatures(mockAdminReq);
      expect(service.getPendingFeatures).toHaveBeenCalled();
    });

    it('should throw Forbidden for non-admin', async () => {
      await expect(controller.approveFeature(mockMerchantReq, 1))
        .rejects.toThrow(ForbiddenException);
      await expect(controller.rejectFeature(mockMerchantReq, 1))
        .rejects.toThrow(ForbiddenException);
      await expect(controller.getPendingFeatures(mockMerchantReq))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
