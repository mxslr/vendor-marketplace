import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '../auth/auth.guard';
import { TransactionStatus } from '@prisma/client';

interface RequestWithUsers extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Endpoint: GET /transactions/my-history
  @Get('my-history')
  async findMyTransactions(@Request() req: RequestWithUsers) {
    return this.transactionsService.findMyTransactions(req.user.sub);
  }

  // Endpoint: GET /transactions/all
  @Get('all')
  async findAll(@Request() req: RequestWithUsers) {
    return this.transactionsService.findAll(req.user.sub);
  }

  // Endpoint: PATCH /transactions/:id/verify
  @Patch(':id/verify')
  async verifyTransaction(
    @Request() req: RequestWithUsers,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: TransactionStatus; verificationNote?: string },
  ) {
    return this.transactionsService.verifyTransaction(
      req.user.sub,
      id,
      body.status,
      body.verificationNote,
    );
  }

  @Get('pending-refunds')
  async getPendingRefunds() {
    return this.transactionsService.getPendingRefundTransactions();
  }

  @Patch(':id/refund')
  async refundOrder(
    @Request() req: RequestWithUsers,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.refundTransaction(req.user.sub, id);
  }

  @Get('pending-releases')
  async getPendingReleases() {
    return this.transactionsService.getPendingReleaseTransactions();
  }

  @Get('financial-summary')
  async getFinancialSummary(
    @Request() req: RequestWithUsers,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    return this.transactionsService.getFinancialSummary(req.user.sub, period);
  }

  @Patch(':id/release')
  async releaseOrder(
    @Request() req: RequestWithUsers,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.releaseTransaction(req.user.sub, id);
  }
}
