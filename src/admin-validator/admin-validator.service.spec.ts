import { Test, TestingModule } from '@nestjs/testing';
import { AdminValidatorService } from './admin-validator.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MerchantStatus } from '@prisma/client';

describe('AdminValidatorService', () => {
  let service: AdminValidatorService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(async () => {
    prisma = {
      merchant: {
        findMany: jest.fn(),
        count: jest.fn(),
      } as any,
      $transaction: jest.fn((promises) => Promise.all(promises)) as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminValidatorService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: NotificationsService,
          useValue: {
            createForRole: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminValidatorService>(AdminValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMerchants', () => {
    it('should return paginated merchants with status filter ALL by default', async () => {
      const mockMerchants = [
        {
          id: 1,
          shopName: 'Merchant 1',
          status: MerchantStatus.PENDING_VERIFICATION,
        },
      ];
      (prisma.merchant.findMany as jest.Mock).mockResolvedValue(mockMerchants);
      (prisma.merchant.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getMerchants({});

      expect(prisma.merchant.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.merchant.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
        data: mockMerchants,
        meta: {
          total: 1,
          page: 1,
          lastPage: 1,
          limit: 10,
        },
      });
    });

    it('should filter by specific status and pagination options', async () => {
      const mockMerchants = [
        {
          id: 2,
          shopName: 'Merchant 2',
          status: MerchantStatus.ACTIVE,
        },
      ];
      (prisma.merchant.findMany as jest.Mock).mockResolvedValue(mockMerchants);
      (prisma.merchant.count as jest.Mock).mockResolvedValue(15);

      const result = await service.getMerchants({
        status: 'ACTIVE' as any,
        page: 2,
        limit: 5,
      });

      expect(prisma.merchant.findMany).toHaveBeenCalledWith({
        where: { status: MerchantStatus.ACTIVE },
        skip: 5,
        take: 5,
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.merchant.count).toHaveBeenCalledWith({
        where: { status: MerchantStatus.ACTIVE },
      });
      expect(result).toEqual({
        data: mockMerchants,
        meta: {
          total: 15,
          page: 2,
          lastPage: 3,
          limit: 5,
        },
      });
    });
  });
});
