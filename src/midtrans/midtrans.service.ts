import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Midtrans = require('midtrans-client');

export interface SnapTransactionParams {
  orderId: string;
  amount: number;
  customerDetails: { firstName: string; email: string };
  itemDetails: { id: string; price: number; quantity: number; name: string }[];
}

@Injectable()
export class MidtransService {
  private snap: any;
  private coreApi: any;
  private readonly serverKey: string;

  constructor(private config: ConfigService) {
    const serverKey = config.get<string>('MIDTRANS_SERVER_KEY');
    const clientKey = config.get<string>('MIDTRANS_CLIENT_KEY');

    if (!serverKey || !clientKey) {
      throw new Error(
        'Midtrans configuration missing: MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY must be set',
      );
    }

    this.serverKey = serverKey;
    const isProduction = config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';

    this.snap = new Midtrans.Snap({ isProduction, serverKey, clientKey });
    this.coreApi = new Midtrans.CoreApi({ isProduction, serverKey, clientKey });
  }

  async createSnapToken(params: SnapTransactionParams): Promise<string> {
    const response = await this.snap.createTransaction({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.amount,
      },
      customer_details: {
        first_name: params.customerDetails.firstName,
        email: params.customerDetails.email,
      },
      item_details: params.itemDetails,
    });
    return response.token as string;
  }

  async createRefund(midtransTransactionId: string, amount: number, reason: string): Promise<void> {
    await this.coreApi.refundTransaction(midtransTransactionId, { amount, reason });
  }

  validateWebhookSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string | number,
    incomingSignature: string,
  ): boolean {
    // Midtrans always sends gross_amount as "150000.00" (string with 2 decimals).
    // If a numeric value slips through JSON parsing, stringify it to avoid hash mismatch.
    const grossStr = String(grossAmount);
    const hash = crypto
      .createHash('sha512')
      .update(orderId + statusCode + grossStr + this.serverKey)
      .digest('hex');
    return hash === incomingSignature;
  }
}
