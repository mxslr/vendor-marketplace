import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // Public endpoint — NO @UseGuards(AuthGuard). Security via SHA-512 signature validation inside PaymentsService.
  @Post('midtrans/webhook')
  @HttpCode(HttpStatus.OK)
  async handleMidtransWebhook(@Body() payload: any) {
    await this.paymentsService.handleMidtransWebhook(payload);
    return { status: 'ok' };
  }
}
