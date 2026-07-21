import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateWithdrawalDto, CompleteWithdrawalDto } from './withdrawals.dto';
import { StorageService } from '../storage/storage.service';

describe('WithdrawalsController', () => {
  let controller: WithdrawalsController;
  let service: jest.Mocked<Partial<WithdrawalsService>>;
  let module: TestingModule;

  beforeEach(async () => {
    service = {
      requestWithdrawal: jest.fn(),
      findMyWithdrawals: jest.fn(),
      findPendingWithdrawals: jest.fn(),
      findWithdrawalById: jest.fn(),
      completeWithdrawal: jest.fn(),
      rejectWithdrawal: jest.fn(),
    };

    module = await Test.createTestingModule({
      controllers: [WithdrawalsController],
      providers: [
        { provide: WithdrawalsService, useValue: service },
        { provide: StorageService, useValue: { uploadFile: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<WithdrawalsController>(WithdrawalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockReq = { user: { sub: '1', role: 'USER' } } as any;

  describe('requestWithdrawal', () => {
    it('should call service', async () => {
      const dto: CreateWithdrawalDto = {
        bankAccountId: 10,
        amount: 50000,
        pin: '1234',
      };
      await controller.requestWithdrawal(mockReq, dto);
      expect(service.requestWithdrawal).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('findMyWithdrawals', () => {
    it('should call service', async () => {
      await controller.findMyWithdrawals(mockReq);
      expect(service.findMyWithdrawals).toHaveBeenCalledWith(1);
    });
  });

  describe('findPendingWithdrawals', () => {
    it('should call service', async () => {
      await controller.findPendingWithdrawals(mockReq);
      expect(service.findPendingWithdrawals).toHaveBeenCalledWith(1);
    });
  });

  describe('findWithdrawalById', () => {
    it('should call service', async () => {
      await controller.findWithdrawalById(mockReq, 10);
      expect(service.findWithdrawalById).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('completeWithdrawal', () => {
    it('should call service', async () => {
      const dto: CompleteWithdrawalDto = { proofUrl: '' };
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const storageService = module.get<StorageService>(StorageService);
      jest.spyOn(storageService, 'uploadFile').mockResolvedValue('url');

      await controller.completeWithdrawal(mockReq, 10, dto, mockFile);
      expect(service.completeWithdrawal).toHaveBeenCalledWith(1, 10, { proofUrl: 'url' });
    });
  });

  describe('rejectWithdrawal', () => {
    it('should call service', async () => {
      await controller.rejectWithdrawal(mockReq, 10);
      expect(service.rejectWithdrawal).toHaveBeenCalledWith(1, 10);
    });
  });
});
