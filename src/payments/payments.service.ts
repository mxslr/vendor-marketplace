import { Injectable } from '@nestjs/common';
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
  constructor(
    private prisma: PrismaService,
    private midtrans: MidtransService,
    private notifications: NotificationsService,
  ) {}

  async handleMidtransWebhook(payload: MidtransNotificationPayload): Promise<void> {
    console.log('[Webhook] ▶ Incoming Midtrans payload:', JSON.stringify(payload, null, 2));

    // Step 1: Validate signature
    // gross_amount must be a string for correct SHA-512 — coerce in case JSON parser returns a number
    const grossAmountStr = String(payload.gross_amount);
    const isValid = this.midtrans.validateWebhookSignature(
      payload.order_id,
      payload.status_code,
      grossAmountStr,
      payload.signature_key,
    );

    if (!isValid) {
      console.error(
        `[Webhook] ✗ Signature INVALID for order_id="${payload.order_id}". ` +
          `Computed from: order_id+status_code+gross_amount+serverKey. ` +
          `Received signature_key="${payload.signature_key}"`,
      );
      return;
    }
    console.log(`[Webhook] ✓ Signature valid for order_id="${payload.order_id}"`);

    // Step 2: Parse internal order ID from "order-{id}-{timestamp}" format
    const orderIdMatch = payload.order_id.match(/^order-(\d+)/);
    if (!orderIdMatch) {
      console.error(
        `[Webhook] ✗ Cannot parse internal order ID from order_id="${payload.order_id}". ` +
          `Expected format: "order-{id}-{timestamp}"`,
      );
      return;
    }
    const internalOrderId = parseInt(orderIdMatch[1], 10);
    console.log(`[Webhook] ✓ Parsed internalOrderId=${internalOrderId}`);

    // Step 3: Look up the order
    const order = await this.prisma.order.findUnique({
      where: { id: internalOrderId },
      include: { client: true, gig: true, customOffer: true },
    });

    if (!order) {
      console.error(`[Webhook] ✗ Order not found in DB: id=${internalOrderId}`);
      return;
    }
    console.log(`[Webhook] ✓ Found order id=${order.id} status="${order.status}" midtransTransactionId="${order.midtransTransactionId}"`);

    // Step 4: Idempotency — skip if this transaction_id was already processed
    if (order.midtransTransactionId === payload.transaction_id) {
      console.log(
        `[Webhook] ⚠ Duplicate webhook ignored — transaction_id="${payload.transaction_id}" already recorded on order ${order.id}`,
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

    console.log(
      `[Webhook] transaction_status="${status}" fraud_status="${fraudStatus}" → isSuccess=${isSuccess} isFailed=${isFailed}`,
    );

    if (isSuccess) {
      await this.processSuccessfulPayment(order, payload);
    } else if (isFailed) {
      await this.processCancelledPayment(order, payload);
    } else {
      console.log(
        `[Webhook] ℹ Pending/unknown status "${status}" for order ${internalOrderId} — no action taken.`,
      );
    }
  }

  private async processSuccessfulPayment(
    order: any,
    payload: MidtransNotificationPayload,
  ): Promise<void> {
    console.log(`[Webhook] processSuccessfulPayment ▶ order ${order.id} status="${order.status}"`);

    if (order.status !== OrderStatus.UNPAID) {
      console.error(
        `[Webhook] ✗ Order ${order.id} is "${order.status}", not UNPAID — skipping settlement.`,
      );
      return;
    }

    const deadlineDays = order.customOffer?.deadlineDays ?? 7;
    const deadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);
    const nettPayout = order.totalAmount.sub(order.adminFee);

    console.log(
      `[Webhook] Updating order ${order.id}: status→IN_PROGRESS, ` +
        `midtransTransactionId="${payload.transaction_id}", ` +
        `nettPayout=${nettPayout}, deadline=${deadline.toISOString()}`,
    );

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

    console.log(
      `[Webhook] ✓ Order ${order.id} → IN_PROGRESS. ` +
        `Merchant ${order.merchantId} pendingBalance +${nettPayout}`,
    );

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
  }

  private async processCancelledPayment(
    order: any,
    payload: MidtransNotificationPayload,
  ): Promise<void> {
    console.log(
      `[Webhook] processCancelledPayment ▶ order ${order.id} status="${order.status}" ` +
        `transaction_status="${payload.transaction_status}"`,
    );

    if (order.status !== OrderStatus.UNPAID) {
      console.log(
        `[Webhook] ⚠ Order ${order.id} is "${order.status}", not UNPAID — skip cancellation.`,
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

    console.log(`[Webhook] ✓ Order ${order.id} → CANCELLED (${payload.transaction_status})`);
  }
}
