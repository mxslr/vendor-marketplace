import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyReportService } from './monthly-report.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MonthlyReportStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

describe('MonthlyReportService', () => {
    let service: MonthlyReportService;
    let prisma: jest.Mocked<Partial<PrismaService>>;

    beforeEach(async () => {
        prisma = {
            monthlyReport: {
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                findMany: jest.fn(),
            } as any,
            order: {
                aggregate: jest.fn(),
            } as any,
            featuredPlacement: {
                aggregate: jest.fn(),
            } as any,
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MonthlyReportService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<MonthlyReportService>(MonthlyReportService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateReport', () => {
        it('should throw if period format is invalid', async () => {
            await expect(service.generateReport({ period: 'invalid' })).rejects.toThrow(BadRequestException);
        });

        it('should throw if report already exists', async () => {
            (prisma.monthlyReport.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
            await expect(service.generateReport({ period: '2023-10' })).rejects.toThrow(BadRequestException);
        });

        it('should generate report successfully', async () => {
            (prisma.monthlyReport.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.order.aggregate as jest.Mock).mockResolvedValueOnce({ _sum: { totalAmount: new Decimal(1000) } });
            (prisma.order.aggregate as jest.Mock).mockResolvedValueOnce({ _sum: { adminFee: new Decimal(100) } });
            (prisma.featuredPlacement.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: new Decimal(50) } });
            
            (prisma.monthlyReport.create as jest.Mock).mockResolvedValue({
                id: 1,
                period: '2023-10',
                totalGmv: new Decimal(1000),
                grossRevenue: new Decimal(150),
                operationalCost: new Decimal(0),
                netProfit: new Decimal(150),
                cscShare: new Decimal(90),
                cciShare: new Decimal(60),
                status: MonthlyReportStatus.DRAFT,
            });

            const res = await service.generateReport({ period: '2023-10' });
            expect(res.period).toBe('2023-10');
            expect(prisma.monthlyReport.create).toHaveBeenCalled();
        });
    });

    describe('updateOperationalCost', () => {
        it('should throw if report not found', async () => {
            (prisma.monthlyReport.findUnique as jest.Mock).mockResolvedValue(null);
            await expect(service.updateOperationalCost(1, { operationalCost: 100 })).rejects.toThrow(NotFoundException);
        });

        it('should throw if not draft', async () => {
            (prisma.monthlyReport.findUnique as jest.Mock).mockResolvedValue({ status: MonthlyReportStatus.PROCESSED });
            await expect(service.updateOperationalCost(1, { operationalCost: 100 })).rejects.toThrow(BadRequestException);
        });

        it('should update cost', async () => {
            (prisma.monthlyReport.findUnique as jest.Mock).mockResolvedValue({
                status: MonthlyReportStatus.DRAFT,
                grossRevenue: new Decimal(150),
            });
            (prisma.monthlyReport.update as jest.Mock).mockResolvedValue({
                id: 1, totalGmv: new Decimal(1000), grossRevenue: new Decimal(150), operationalCost: new Decimal(100), netProfit: new Decimal(50), cscShare: new Decimal(30), cciShare: new Decimal(20)
            });

            await service.updateOperationalCost(1, { operationalCost: 100 });
            expect(prisma.monthlyReport.update).toHaveBeenCalled();
        });
    });

    describe('processDividend', () => {
        it('should update dividend shares', async () => {
            (prisma.monthlyReport.findUnique as jest.Mock).mockResolvedValue({
                status: MonthlyReportStatus.DRAFT,
                netProfit: new Decimal(100),
            });
            (prisma.monthlyReport.update as jest.Mock).mockResolvedValue({
                id: 1, totalGmv: new Decimal(1), grossRevenue: new Decimal(1), operationalCost: new Decimal(1), netProfit: new Decimal(1), cscShare: new Decimal(1), cciShare: new Decimal(1)
            });

            await service.processDividend(1, { cscPercentage: 50, cciPercentage: 50 });
            expect(prisma.monthlyReport.update).toHaveBeenCalled();
        });
    });
});
