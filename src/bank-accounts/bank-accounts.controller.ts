import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { AuthGuard } from '../auth/auth.guard'; 

interface RequestWithUsers extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('bank-accounts')
@UseGuards(AuthGuard) 
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Post()
  async create(@Request() req: RequestWithUsers, @Body() body: any) {
    return this.bankAccountsService.create(req.user.sub, body);
  }

  @Get()
  async findAll(@Request() req: RequestWithUsers) {
    return this.bankAccountsService.findAllByMerchant(req.user.sub);
  }

  @Patch(':id')
  async update(
    @Request() req: RequestWithUsers,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.bankAccountsService.update(req.user.sub, id, body);
  }

  @Delete(':id')
  async remove(@Request() req: RequestWithUsers, @Param('id', ParseIntPipe) id: number) {
    return this.bankAccountsService.remove(req.user.sub, id);
  }
}