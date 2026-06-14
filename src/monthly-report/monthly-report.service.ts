import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  OrderStatus,
  FeaturedPaymentStatus,
  MonthlyReportStatus,
} from '@prisma/client';
import {
  GenerateReportDto,
  UpdateOperationalCostDto,
  ProcessDividendDto,
  UploadProofDto,
  MonthlyReportResponseDto,
} from './monthly-report.dto';
import PDFDocument = require('pdfkit');

@Injectable()
export class MonthlyReportService {
  private readonly logger = new Logger(MonthlyReportService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  async generateReport(
    dto: GenerateReportDto,
  ): Promise<MonthlyReportResponseDto> {
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
        status: {
          in: [FeaturedPaymentStatus.ACTIVE, FeaturedPaymentStatus.EXPIRED],
        },
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

  async updateOperationalCost(
    id: number,
    dto: UpdateOperationalCostDto,
  ): Promise<MonthlyReportResponseDto> {
    const report = await this.prisma.monthlyReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.status !== MonthlyReportStatus.DRAFT) {
      throw new BadRequestException(
        'Can only update operational cost for DRAFT reports',
      );
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

  async processDividend(
    id: number,
    dto: ProcessDividendDto,
  ): Promise<MonthlyReportResponseDto> {
    const report = await this.prisma.monthlyReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.status !== MonthlyReportStatus.DRAFT) {
      throw new BadRequestException(
        'Can only process dividend for DRAFT reports',
      );
    }

    const { cscPercentage = 60, cciPercentage = 40 } = dto;
    if (cscPercentage + cciPercentage !== 100) {
      throw new BadRequestException(
        'CSC and CCI percentages must add up to 100',
      );
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
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== MonthlyReportStatus.PROCESSED) {
      throw new BadRequestException('Can only lock PROCESSED reports');
    }

    const updated = await this.prisma.monthlyReport.update({
      where: { id },
      data: { status: MonthlyReportStatus.LOCKED, lockedAt: new Date() },
    });

    // FIN-05: send dividend PDF report to CSC and CCI heads
    setImmediate(() =>
      this.sendDividendReport(updated).catch((e) =>
        this.logger.error('Failed to send dividend email', e),
      ),
    );

    return this.mapToResponse(updated);
  }

  private async sendDividendReport(report: any): Promise<void> {
    const cscEmail = this.config.get<string>('CSC_EMAIL');
    const cciEmail = this.config.get<string>('CCI_EMAIL');
    const recipients = [cscEmail, cciEmail].filter(Boolean) as string[];
    if (recipients.length === 0) {
      this.logger.warn(
        'CSC_EMAIL and CCI_EMAIL not configured — dividend email skipped.',
      );
      return;
    }

    const pdfBuffer = await this.generateDividendPdf(report);
    const filename = `laporan-dividen-${report.period}.pdf`;

    await this.email.sendWithAttachment({
      to: recipients,
      subject: `[Vendor Marketplace] Laporan Dividen ${report.period} — LOCKED`,
      html: `
        <h2>Laporan Dividen Periode ${report.period}</h2>
        <p>Laporan keuangan bulanan untuk periode <strong>${report.period}</strong> telah dikunci (LOCKED).</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px;border:1px solid #ddd"><strong>Total GMV</strong></td>
              <td style="padding:6px;border:1px solid #ddd">Rp ${Number(report.totalGmv).toLocaleString('id-ID')}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd"><strong>Gross Revenue</strong></td>
              <td style="padding:6px;border:1px solid #ddd">Rp ${Number(report.grossRevenue).toLocaleString('id-ID')}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd"><strong>Biaya Operasional</strong></td>
              <td style="padding:6px;border:1px solid #ddd">Rp ${Number(report.operationalCost).toLocaleString('id-ID')}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd"><strong>Net Profit</strong></td>
              <td style="padding:6px;border:1px solid #ddd">Rp ${Number(report.netProfit).toLocaleString('id-ID')}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd"><strong>Dividen CSC</strong></td>
              <td style="padding:6px;border:1px solid #ddd">Rp ${Number(report.cscShare).toLocaleString('id-ID')}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd"><strong>Dividen CCI</strong></td>
              <td style="padding:6px;border:1px solid #ddd">Rp ${Number(report.cciShare).toLocaleString('id-ID')}</td></tr>
        </table>
        <p style="margin-top:16px">Laporan lengkap terlampir dalam format PDF.</p>
        <p style="color:#999;font-size:12px">Dikirim otomatis oleh sistem Vendor Marketplace</p>
      `,
      attachments: [
        { filename, content: pdfBuffer, contentType: 'application/pdf' },
      ],
    });
  }

  private generateDividendPdf(report: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
      const rows = [
        ['Total GMV', fmt(Number(report.totalGmv))],
        ['Gross Revenue', fmt(Number(report.grossRevenue))],
        ['Biaya Operasional', fmt(Number(report.operationalCost))],
        ['Net Profit', fmt(Number(report.netProfit))],
        ['Dividen CSC', fmt(Number(report.cscShare))],
        ['Dividen CCI', fmt(Number(report.cciShare))],
      ];

      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('LAPORAN DIVIDEN', { align: 'center' });
      doc
        .fontSize(13)
        .font('Helvetica')
        .text(`Periode: ${report.period}`, { align: 'center' });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(0.5);

      rows.forEach(([label, value]) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(label, 50, doc.y, { continued: true, width: 300 });
        doc.font('Helvetica').text(value, { align: 'right' });
        doc.moveDown(0.3);
      });

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#999')
        .text(
          `Dokumen ini dikunci pada ${new Date(report.lockedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}.`,
          { align: 'center' },
        )
        .text('Diterbitkan otomatis oleh sistem Vendor Marketplace.', {
          align: 'center',
        });

      doc.end();
    });
  }

  async uploadProof(
    id: number,
    dto: UploadProofDto,
  ): Promise<MonthlyReportResponseDto> {
    const report = await this.prisma.monthlyReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.status !== MonthlyReportStatus.LOCKED) {
      throw new BadRequestException(
        'Bukti transfer hanya bisa diupload setelah laporan dikunci (LOCKED).',
      );
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
