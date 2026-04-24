import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateWithdrawalDto, CompleteWithdrawalDto } from './withdrawals.dto';

describe('WithdrawalsController', () => {
    let controller: WithdrawalsController;
    let service: jest.Mocked<Partial<WithdrawalsService>>;

    beforeEach(async () => {
        service = {
            requestWithdrawal: jest.fn(),
            findMyWithdrawals: jest.fn(),
            findPendingWithdrawals: jest.fn(),
            findWithdrawalById: jest.fn(),
            completeWithdrawal: jest.fn(),
            rejectWithdrawal: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [WithdrawalsController],
            providers: [{ provide: WithdrawalsService, useValue: service }],
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
            const dto: CreateWithdrawalDto = { bankAccountId: 10, amount: 50000, pin: '1234' };
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
            const dto: CompleteWithdrawalDto = { proofUrl: 'url' };
            await controller.completeWithdrawal(mockReq, 10, dto);
            expect(service.completeWithdrawal).toHaveBeenCalledWith(1, 10, dto);
        });
    });

    describe('rejectWithdrawal', () => {
        it('should call service', async () => {
            await controller.rejectWithdrawal(mockReq, 10);
            expect(service.rejectWithdrawal).toHaveBeenCalledWith(1, 10);
        });
    });
});
