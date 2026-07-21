import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyReportController } from './monthly-report.controller';
import { MonthlyReportService } from './monthly-report.service';
import { AuthGuard } from '../auth/auth.guard';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StorageService } from '../storage/storage.service';

describe('MonthlyReportController', () => {
  let controller: MonthlyReportController;
  let service: jest.Mocked<Partial<MonthlyReportService>>;
  let module: TestingModule;

  beforeEach(async () => {
    service = {
      generateReport: jest.fn(),
      updateOperationalCost: jest.fn(),
      processDividend: jest.fn(),
      lockReport: jest.fn(),
      uploadProof: jest.fn(),
      getReports: jest.fn(),
      getReportById: jest.fn(),
    };

    module = await Test.createTestingModule({
      controllers: [MonthlyReportController],
      providers: [
        { provide: MonthlyReportService, useValue: service },
        { provide: StorageService, useValue: { uploadFile: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<MonthlyReportController>(MonthlyReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockAdminReq = { user: { sub: 1, role: Role.ADMIN_FINANCE } } as any;
  const mockUserReq = { user: { sub: 2, role: Role.CLIENT } } as any;

  describe('generateReport', () => {
    it('should call service for admin', async () => {
      const dto = { period: '2023-10' };
      await controller.generateReport(mockAdminReq, dto);
      expect(service.generateReport).toHaveBeenCalledWith(dto);
    });

    it('should throw Forbidden for non-admin', async () => {
      await expect(
        controller.generateReport(mockUserReq, { period: '2023-10' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateOperationalCost', () => {
    it('should call service for admin', async () => {
      await controller.updateOperationalCost(mockAdminReq, 1, {
        operationalCost: 100,
      });
      expect(service.updateOperationalCost).toHaveBeenCalledWith(1, {
        operationalCost: 100,
      });
    });
  });

  describe('processDividend', () => {
    it('should call service for admin', async () => {
      await controller.processDividend(mockAdminReq, 1, {
        cscPercentage: 60,
        cciPercentage: 40,
      });
      expect(service.processDividend).toHaveBeenCalledWith(1, {
        cscPercentage: 60,
        cciPercentage: 40,
      });
    });
  });

  describe('lockReport', () => {
    it('should call service for admin', async () => {
      await controller.lockReport(mockAdminReq, 1);
      expect(service.lockReport).toHaveBeenCalledWith(1);
    });
  });

  describe('uploadProof', () => {
    it('should call service for admin', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const storageService = module.get<StorageService>(StorageService);
      jest.spyOn(storageService, 'uploadFile').mockResolvedValue('url');

      await controller.uploadProof(mockAdminReq, 1, { proofUrl: '' }, mockFile);
      expect(service.uploadProof).toHaveBeenCalledWith(1, { proofUrl: 'url' });
    });
  });

  describe('getReports', () => {
    it('should call service for admin', async () => {
      await controller.getReports(mockAdminReq);
      expect(service.getReports).toHaveBeenCalled();
    });
  });

  describe('getReportById', () => {
    it('should call service for admin', async () => {
      await controller.getReportById(mockAdminReq, 1);
      expect(service.getReportById).toHaveBeenCalledWith(1);
    });
  });
});
