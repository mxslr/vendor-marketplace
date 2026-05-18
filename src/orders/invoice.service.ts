import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import PDFDocument = require('pdfkit');

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async generateInvoice(orderId: number, clientId: number): Promise<Buffer> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientId },
      include: {
        client: { select: { fullName: true, email: true } },
        merchant: { select: { shopName: true } },
        gig: { select: { title: true } },
      },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan.');
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Invoice hanya tersedia untuk pesanan yang sudah selesai.');
    }

    const serviceName = order.gig?.title ?? 'Layanan Vendor Marketplace';
    const totalAmount = Number(order.totalAmount);
    const adminFee = Number(order.adminFee);
    const netAmount = totalAmount - adminFee;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(22).font('Helvetica-Bold').text('VENDOR MARKETPLACE', 50, 50);
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text('Platform Layanan Kampus', 50, 78);

      doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#ddd').stroke();

      // Invoice title
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000')
        .text('INVOICE DIGITAL', 50, 115);
      doc.fontSize(10).font('Helvetica').fillColor('#444')
        .text(`No. Invoice: INV-${String(order.id).padStart(6, '0')}`, 50, 140)
        .text(`Tanggal: ${new Date(order.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, 155);

      // Client info
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Kepada:', 50, 190);
      doc.fontSize(10).font('Helvetica').fillColor('#333')
        .text(order.client.fullName, 50, 205)
        .text(order.client.email, 50, 220);

      // Merchant info
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Dari:', 300, 190);
      doc.fontSize(10).font('Helvetica').fillColor('#333')
        .text(order.merchant.shopName, 300, 205);

      doc.moveTo(50, 250).lineTo(545, 250).strokeColor('#ddd').stroke();

      // Table header
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#fff')
        .rect(50, 260, 495, 22).fill('#333');
      doc.fillColor('#fff')
        .text('Deskripsi', 58, 266)
        .text('Total', 460, 266, { align: 'right', width: 78 });

      // Table row
      doc.fontSize(10).font('Helvetica').fillColor('#333')
        .rect(50, 282, 495, 28).fill('#f9f9f9');
      doc.fillColor('#000')
        .text(serviceName, 58, 290, { width: 380 })
        .text(`Rp ${totalAmount.toLocaleString('id-ID')}`, 460, 290, { align: 'right', width: 78 });

      // Totals
      const totalsY = 325;
      doc.moveTo(350, totalsY).lineTo(545, totalsY).strokeColor('#ddd').stroke();

      doc.fontSize(10).font('Helvetica').fillColor('#555')
        .text('Subtotal', 360, totalsY + 8)
        .text(`Rp ${totalAmount.toLocaleString('id-ID')}`, 460, totalsY + 8, { align: 'right', width: 78 });

      doc.text('Admin Fee (komisi platform)', 360, totalsY + 24)
        .text(`Rp ${adminFee.toLocaleString('id-ID')}`, 460, totalsY + 24, { align: 'right', width: 78 });

      doc.moveTo(350, totalsY + 42).lineTo(545, totalsY + 42).strokeColor('#aaa').stroke();

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
        .text('Total Dibayar', 360, totalsY + 48)
        .text(`Rp ${totalAmount.toLocaleString('id-ID')}`, 460, totalsY + 48, { align: 'right', width: 78 });

      doc.fontSize(9).font('Helvetica').fillColor('#777')
        .text(`(Vendor menerima Rp ${netAmount.toLocaleString('id-ID')} setelah potongan komisi)`, 360, totalsY + 65);

      // Status stamp
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#27ae60');
      doc.save();
      doc.opacity(0.15);
      doc.rotate(-20, { origin: [280, 420] });
      doc.text('SELESAI', 130, 400);
      doc.restore();
      doc.opacity(1);

      // Footer
      doc.moveTo(50, 720).lineTo(545, 720).strokeColor('#ddd').stroke();
      doc.fontSize(8).font('Helvetica').fillColor('#999')
        .text('Dokumen ini diterbitkan secara otomatis oleh sistem Vendor Marketplace.', 50, 730, { align: 'center', width: 495 })
        .text('Dapat digunakan sebagai bukti transaksi untuk keperluan LPJ atau administrasi kampus.', 50, 742, { align: 'center', width: 495 });

      doc.end();
    });
  }
}
