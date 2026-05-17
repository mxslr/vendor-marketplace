import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MidtransService } from '../midtrans/midtrans.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  OrderStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

interface MidtransNotificationPayload {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  fraud_status?: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  payment_type?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private midtrans: MidtransService,
    private notifications: NotificationsService,
  ) {}

  async handleMidtransWebhook(
    payload: MidtransNotificationPayload,
  ): Promise<void> {
    // Step 1: Validate signature
    const isValid = this.midtrans.validateWebhookSignature(
      payload.order_id,
      payload.status_code,
      payload.gross_amount,
      payload.signature_key,
    );
    if (!isValid) {
      this.logger.warn(
        `Invalid Midtrans signature for order_id: ${payload.order_id}`,
      );
      return;
    }

    // Step 2: Parse internal order ID from "order-{id}-{timestamp}" format
    const orderIdMatch = payload.order_id.match(/^order-(\d+)/);
    if (!orderIdMatch) {
      this.logger.warn(`Cannot parse order ID from: ${payload.order_id}`);
      return;
    }
    const internalOrderId = parseInt(orderIdMatch[1], 10);

    const order = await this.prisma.order.findUnique({
      where: { id: internalOrderId },
      include: { client: true, gig: true, customOffer: true },
    });
    if (!order) {
      this.logger.warn(`Order not found: ${internalOrderId}`);
      return;
    }

    // Step 3: Idempotency — skip if this transaction_id was already processed
    if (order.midtransTransactionId === payload.transaction_id) {
      this.logger.log(
        `Duplicate webhook ignored for transaction: ${payload.transaction_id}`,
      );
      return;
    }

    const status = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    const isSuccess =
      status === 'settlement' ||
      (status === 'capture' && fraudStatus === 'accept');
    const isFailed =
      status === 'expire' || status === 'cancel' || status === 'deny';

    if (isSuccess) {
      await this.processSuccessfulPayment(order, payload);
    } else if (isFailed) {
      await this.processCancelledPayment(order, payload);
    } else {
      this.logger.log(
        `Pending payment for order ${internalOrderId}, no action taken.`,
      );
    }
  }

  private async processSuccessfulPayment(
    order: any,
    payload: MidtransNotificationPayload,
  ): Promise<void> {
    if (order.status !== OrderStatus.UNPAID) {
      this.logger.warn(
        `Order ${order.id} is not UNPAID, skipping settlement.`,
      );
      return;
    }

    const deadlineDays = order.customOffer?.deadlineDays ?? 7;
    const deadline = new Date(
      Date.now() + deadlineDays * 24 * 60 * 60 * 1000,
    );
    const nettPayout = order.totalAmount.sub(order.adminFee);

    await this.prisma.$transaction(async (prisma) => {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.IN_PROGRESS,
          paymentMethod: payload.payment_type ?? 'midtrans',
          midtransTransactionId: payload.transaction_id,
          snapToken: null,
          deadline,
        },
      });

      await prisma.transaction.create({
        data: {
          orderId: order.id,
          userId: order.clientId,
          type: TransactionType.PAYMENT,
          amount: order.totalAmount,
          status: TransactionStatus.VERIFIED,
          proofUrl: null,
        },
      });

      await prisma.merchant.update({
        where: { id: order.merchantId },
        data: { pendingBalance: { increment: nettPayout } },
      });
    });

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: order.merchantId },
    });
    if (merchant) {
      await this.notifications.create(
        merchant.userId,
        NotificationType.NEW_ORDER,
        'Pesanan Baru Masuk',
        `Pesanan #${order.id} telah dibayar via Midtrans. Segera proses pesanan.`,
        JSON.stringify({ orderId: order.id }),
      );
    }

    this.logger.log(
      `Order ${order.id} settled via Midtrans (txId: ${payload.transaction_id})`,
    );
  }

  private async processCancelledPayment(
    order: any,
    payload: MidtransNotificationPayload,
  ): Promise<void> {
    if (order.status !== OrderStatus.UNPAID) {
      this.logger.warn(
        `Order ${order.id} is not UNPAID, skipping cancellation.`,
      );
      return;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        midtransTransactionId: payload.transaction_id,
      },
    });

    this.logger.log(
      `Order ${order.id} cancelled (status: ${payload.transaction_status})`,
    );
  }
}
