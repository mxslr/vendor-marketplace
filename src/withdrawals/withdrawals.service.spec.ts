import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalsService } from './withdrawals.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role, WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

describe('WithdrawalsService', () => {
    let service: WithdrawalsService;
    let prisma: jest.Mocked<Partial<PrismaService>>;

    beforeEach(async () => {
        prisma = {
            merchant: {
                findUnique: jest.fn(),
                update: jest.fn(),
            } as any,
            user: {
                findUnique: jest.fn(),
            } as any,
            bankAccount: {
                findUnique: jest.fn(),
            } as any,
            withdrawal: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
            } as any,
            $transaction: jest.fn((cb) => cb(prisma)) as any,
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WithdrawalsService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<WithdrawalsService>(WithdrawalsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('requestWithdrawal', () => {
        it('should throw if merchant not found', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue(null);
            await expect(service.requestWithdrawal(1, { bankAccountId: 1, amount: 50000, pin: '123' })).rejects.toThrow(ForbiddenException);
        });

        it('should throw if bank account not found or not owned', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 10 });
            (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue(null);
            await expect(service.requestWithdrawal(1, { bankAccountId: 1, amount: 50000, pin: '123' })).rejects.toThrow(NotFoundException);
        });

        it('should throw if pin is not set', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 10, withdrawalPin: null });
            (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue({ merchantId: 10 });
            await expect(service.requestWithdrawal(1, { bankAccountId: 1, amount: 50000, pin: '123' })).rejects.toThrow(BadRequestException);
        });

        it('should throw if pin is invalid', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 10, withdrawalPin: '0000' });
            (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue({ merchantId: 10 });
            await expect(service.requestWithdrawal(1, { bankAccountId: 1, amount: 50000, pin: '1234' })).rejects.toThrow(BadRequestException);
        });

        it('should throw if amount is less than 50000', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 10, withdrawalPin: '1234' });
            (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue({ merchantId: 10 });
            await expect(service.requestWithdrawal(1, { bankAccountId: 1, amount: 10000, pin: '1234' })).rejects.toThrow(BadRequestException);
        });

        it('should throw if balance is insufficient', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 10, withdrawalPin: '1234', walletBalance: new Decimal(10000) });
            (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue({ merchantId: 10 });
            await expect(service.requestWithdrawal(1, { bankAccountId: 1, amount: 50000, pin: '1234' })).rejects.toThrow(BadRequestException);
        });

        it('should create withdrawal request', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 10, withdrawalPin: '1234', walletBalance: new Decimal(100000) });
            (prisma.bankAccount.findUnique as jest.Mock).mockResolvedValue({ id: 1, merchantId: 10 });
            (prisma.withdrawal.create as jest.Mock).mockResolvedValue({ id: 100 });

            const res = await service.requestWithdrawal(1, { bankAccountId: 1, amount: 50000, pin: '1234' });
            expect(res).toEqual({ id: 100 });
            expect(prisma.merchant.update).toHaveBeenCalled();
            expect(prisma.withdrawal.create).toHaveBeenCalled();
        });
    });

    describe('findPendingWithdrawals', () => {
        it('should return pending withdrawals for admin', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: Role.ADMIN_FINANCE });
            (prisma.withdrawal.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);

            const res = await service.findPendingWithdrawals(1);
            expect(res).toEqual([{ id: 1 }]);
        });

        it('should throw for non-admin', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: Role.USER });
            await expect(service.findPendingWithdrawals(1)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('completeWithdrawal', () => {
        it('should complete withdrawal for admin', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: Role.ADMIN_FINANCE });
            (prisma.withdrawal.findUnique as jest.Mock).mockResolvedValue({ id: 1, status: WithdrawalStatus.PENDING, merchantId: 10, amount: 50000 });
            (prisma.withdrawal.update as jest.Mock).mockResolvedValue({ id: 1, status: WithdrawalStatus.COMPLETED });

            const res = await service.completeWithdrawal(1, 1, { proofUrl: 'url' });
            expect(res).toEqual({ id: 1, status: WithdrawalStatus.COMPLETED });
            expect(prisma.merchant.update).toHaveBeenCalled();
        });
    });

    describe('rejectWithdrawal', () => {
        it('should reject withdrawal for admin', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: Role.ADMIN_FINANCE });
            (prisma.withdrawal.findUnique as jest.Mock).mockResolvedValue({ id: 1, status: WithdrawalStatus.PENDING, merchantId: 10, amount: 50000 });
            (prisma.withdrawal.update as jest.Mock).mockResolvedValue({ id: 1, status: WithdrawalStatus.REJECTED });

            const res = await service.rejectWithdrawal(1, 1);
            expect(res).toEqual({ id: 1, status: WithdrawalStatus.REJECTED });
            expect(prisma.merchant.update).toHaveBeenCalled();
        });
    });

    describe('findMyWithdrawals', () => {
        it('should return merchant withdrawals', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 10 });
            (prisma.withdrawal.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);

            const res = await service.findMyWithdrawals(1);
            expect(res).toEqual([{ id: 1 }]);
        });
    });

    describe('findWithdrawalById', () => {
        it('should return withdrawal if owned by merchant', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 10 });
            (prisma.withdrawal.findUnique as jest.Mock).mockResolvedValue({ id: 1, merchantId: 10 });

            const res = await service.findWithdrawalById(1, 1);
            expect(res).toEqual({ id: 1, merchantId: 10 });
        });

        it('should throw if not owned by merchant', async () => {
            (prisma.merchant.findUnique as jest.Mock).mockResolvedValue({ id: 10 });
            (prisma.withdrawal.findUnique as jest.Mock).mockResolvedValue({ id: 1, merchantId: 20 });
            await expect(service.findWithdrawalById(1, 1)).rejects.toThrow(NotFoundException);
        });
    });
});
