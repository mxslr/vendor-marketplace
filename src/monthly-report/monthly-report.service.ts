import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, FeaturedPaymentStatus, MonthlyReportStatus } from '@prisma/client';
import {
  GenerateReportDto,
  UpdateOperationalCostDto,
  ProcessDividendDto,
  UploadProofDto,
  MonthlyReportResponseDto,
} from './monthly-report.dto';

@Injectable()
export class MonthlyReportService {
  constructor(private prisma: PrismaService) {}

  async generateReport(dto: GenerateReportDto): Promise<MonthlyReportResponseDto> {
    const { period } = dto;

    // Validate period format
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new BadRequestException('Period must be in format YYYY-MM');
    }

    // Check if report already exists
    const existing = await this.prisma.monthlyReport.findUnique({
      where: { period },
    });
    if (existing) {
      throw new BadRequestException('Report for this period already exists');
    }

    // Calculate period dates
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 1); // First day of next month

    // Calculate GMV: sum of totalAmount from COMPLETED orders
    const gmvResult = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: OrderStatus.COMPLETED,
        createdAt: { gte: startDate, lt: endDate },
      },
    });
    const totalGmv = gmvResult._sum.totalAmount?.toNumber() || 0;

    // Calculate Commission: sum of adminFee from COMPLETED orders
    const commissionResult = await this.prisma.order.aggregate({
      _sum: { adminFee: true },
      where: {
        status: OrderStatus.COMPLETED,
        createdAt: { gte: startDate, lt: endDate },
      },
    });
    const commissionFee = commissionResult._sum.adminFee?.toNumber() || 0;

    // Calculate Ad Revenue: sum of amount from ACTIVE/EXPIRED featured placements
    const adResult = await this.prisma.featuredPlacement.aggregate({
      _sum: { amount: true },
      where: {
        status: { in: [FeaturedPaymentStatus.ACTIVE, FeaturedPaymentStatus.EXPIRED] },
        createdAt: { gte: startDate, lt: endDate },
      },
    });
    const adRevenue = adResult._sum.amount?.toNumber() || 0;

    // Gross Revenue = Commission + Ad Revenue
    const grossRevenue = commissionFee + adRevenue;

    // Operational Cost starts at 0
    const operationalCost = 0;

    // Net Profit = Gross - Operational
    const netProfit = grossRevenue - operationalCost;

    // Shares (default 60% CSC, 40% CCI)
    const cscShare = netProfit * 0.6;
    const cciShare = netProfit * 0.4;

    // Create report
    const report = await this.prisma.monthlyReport.create({
      data: {
        period,
        totalGmv,
        grossRevenue,
        operationalCost,
        netProfit,
        cscShare,
        cciShare,
        status: MonthlyReportStatus.DRAFT,
      },
    });

    return this.mapToResponse(report);
  }

  async updateOperationalCost(id: number, dto: UpdateOperationalCostDto): Promise<MonthlyReportResponseDto> {
    const report = await this.prisma.monthlyReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.status !== MonthlyReportStatus.DRAFT) {
      throw new BadRequestException('Can only update operational cost for DRAFT reports');
    }

    const { operationalCost } = dto;
    const netProfit = report.grossRevenue.toNumber() - operationalCost;
    const cscShare = netProfit * 0.6;
    const cciShare = netProfit * 0.4;

    const updated = await this.prisma.monthlyReport.update({
      where: { id },
      data: {
        operationalCost,
        netProfit,
        cscShare,
        cciShare,
      },
    });

    return this.mapToResponse(updated);
  }

  async processDividend(id: number, dto: ProcessDividendDto): Promise<MonthlyReportResponseDto> {
    const report = await this.prisma.monthlyReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.status !== MonthlyReportStatus.DRAFT) {
      throw new BadRequestException('Can only process dividend for DRAFT reports');
    }

    const { cscPercentage = 60, cciPercentage = 40 } = dto;
    if (cscPercentage + cciPercentage !== 100) {
      throw new BadRequestException('CSC and CCI percentages must add up to 100');
    }

    const netProfit = report.netProfit.toNumber();
    const cscShare = netProfit * (cscPercentage / 100);
    const cciShare = netProfit * (cciPercentage / 100);

    const updated = await this.prisma.monthlyReport.update({
      where: { id },
      data: {
        cscShare,
        cciShare,
        status: MonthlyReportStatus.PROCESSED,
      },
    });

    return this.mapToResponse(updated);
  }

  async lockReport(id: number): Promise<MonthlyReportResponseDto> {
    const report = await this.prisma.monthlyReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.status !== MonthlyReportStatus.PROCESSED) {
      throw new BadRequestException('Can only lock PROCESSED reports');
    }

    const updated = await this.prisma.monthlyReport.update({
      where: { id },
      data: {
        status: MonthlyReportStatus.LOCKED,
        lockedAt: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  async uploadProof(id: number, dto: UploadProofDto): Promise<MonthlyReportResponseDto> {
    const report = await this.prisma.monthlyReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updated = await this.prisma.monthlyReport.update({
      where: { id },
      data: { proofOfTransfer: dto.proofUrl },
    });

    return this.mapToResponse(updated);
  }

  async getReports(): Promise<MonthlyReportResponseDto[]> {
    const reports = await this.prisma.monthlyReport.findMany({
      orderBy: { period: 'desc' },
    });
    return reports.map(this.mapToResponse);
  }

  async getReportById(id: number): Promise<MonthlyReportResponseDto> {
    const report = await this.prisma.monthlyReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return this.mapToResponse(report);
  }

  private mapToResponse(report: any): MonthlyReportResponseDto {
    return {
      id: report.id,
      period: report.period,
      totalGmv: report.totalGmv.toNumber(),
      grossRevenue: report.grossRevenue.toNumber(),
      operationalCost: report.operationalCost.toNumber(),
      netProfit: report.netProfit.toNumber(),
      cscShare: report.cscShare.toNumber(),
      cciShare: report.cciShare.toNumber(),
      status: report.status,
      proofOfTransfer: report.proofOfTransfer,
      createdAt: report.createdAt,
      lockedAt: report.lockedAt,
    };
  }
}
