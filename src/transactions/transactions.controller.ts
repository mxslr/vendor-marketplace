import { Controller, Get, Patch, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '../auth/auth.guard';
import { TransactionStatus } from '@prisma/client';

interface RequestWithUsers extends Request{
  user: {
    sub: number;
    role: string
  }
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
    @Body() body: { status: TransactionStatus },
  ) {
    return this.transactionsService.verifyTransaction(req.user.sub, id, body.status);
  }
}