import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Request() req: RequestWithUser, @Body() body: { gigId: number }) {
    return this.ordersService.createOrder(req.user.sub, body.gigId);
  }

  @UseGuards(AuthGuard)
  @Get('my-orders')
  findMyOrders(@Request() req: RequestWithUser) {
    return this.ordersService.findMyOrders(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/pay')
  payOrder(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { proofUrl?: string }, 
  ) {
    return this.ordersService.payOrder(Number(id), req.user.sub, body?.proofUrl); 
  }

  @UseGuards(AuthGuard)
  @Get('incoming')
  getIncomingOrders(@Request() req: RequestWithUser) {
    return this.ordersService.getIncomingOrders(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/accept')
  acceptOrder(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.ordersService.acceptOrder(Number(id), req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/complete')
  completeOrder(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.ordersService.completeOrder(Number(id), req.user.sub);
  }
}