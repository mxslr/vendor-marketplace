import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Request,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateWithdrawalDto, CompleteWithdrawalDto } from './withdrawals.dto';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('withdrawals')
@UseGuards(AuthGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  async requestWithdrawal(
    @Request() req: RequestWithUser,
    @Body() body: CreateWithdrawalDto,
  ) {
    return this.withdrawalsService.requestWithdrawal(Number(req.user.sub), body);
  }

  @Get()
  async findMyWithdrawals(@Request() req: RequestWithUser) {
    return this.withdrawalsService.findMyWithdrawals(Number(req.user.sub));
  }
  
  @Get('pending')
  async findPendingWithdrawals(@Request() req: RequestWithUser) {
    return this.withdrawalsService.findPendingWithdrawals(Number(req.user.sub));
  }
  
  @Get(':id')
  async findWithdrawalById(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.withdrawalsService.findWithdrawalById(Number(req.user.sub), id);
  }


  @Patch(':id/complete')
  async completeWithdrawal(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CompleteWithdrawalDto,
  ) {
    return this.withdrawalsService.completeWithdrawal(Number(req.user.sub), id, body);
  }

  @Patch(':id/reject')
  async rejectWithdrawal(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.withdrawalsService.rejectWithdrawal(Number(req.user.sub), id);
  }
}
