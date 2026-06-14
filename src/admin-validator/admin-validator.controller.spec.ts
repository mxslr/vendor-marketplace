import { Test, TestingModule } from '@nestjs/testing';
import { AdminValidatorController } from './admin-validator.controller';
import { AdminValidatorService } from './admin-validator.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AdminValidatorController', () => {
  let controller: AdminValidatorController;
  let service: jest.Mocked<Partial<AdminValidatorService>>;

  beforeEach(async () => {
    service = {
      getMerchants: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminValidatorController],
      providers: [{ provide: AdminValidatorService, useValue: service }],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<AdminValidatorController>(AdminValidatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMerchants', () => {
    const mockRequest = {
      user: {
        sub: 1,
        role: Role.ADMIN_VALIDATOR,
      },
    } as any;

    it('should successfully get merchants for ADMIN_VALIDATOR', async () => {
      const mockResult = {
        data: [],
        meta: { total: 0, page: 1, lastPage: 0, limit: 10 },
      };
      (service.getMerchants as jest.Mock).mockResolvedValue(mockResult);

      const query = { status: 'ALL' as any, page: 1, limit: 10 };
      const res = await controller.getMerchants(mockRequest, query);

      expect(service.getMerchants).toHaveBeenCalledWith(query);
      expect(res).toEqual(mockResult);
    });

    it('should successfully get merchants for SUPER_ADMIN', async () => {
      const mockResult = {
        data: [],
        meta: { total: 0, page: 1, lastPage: 0, limit: 10 },
      };
      (service.getMerchants as jest.Mock).mockResolvedValue(mockResult);

      const query = { status: 'ALL' as any, page: 1, limit: 10 };
      const superAdminReq = {
        user: {
          sub: 1,
          role: Role.SUPER_ADMIN,
        },
      } as any;
      const res = await controller.getMerchants(superAdminReq, query);

      expect(service.getMerchants).toHaveBeenCalledWith(query);
      expect(res).toEqual(mockResult);
    });

    it('should throw ForbiddenException if user role is not allowed', async () => {
      const unauthorizedReq = {
        user: {
          sub: 1,
          role: Role.CLIENT,
        },
      } as any;

      await expect(
        controller.getMerchants(unauthorizedReq, {
          status: 'ALL' as any,
          page: 1,
          limit: 10,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
