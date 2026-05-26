import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { InvoiceService } from './invoice.service';
import { AuthGuard } from '../auth/auth.guard';
import { PostRevisionDto } from './dto/post-revision.dto';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private invoiceService: InvoiceService,
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Request() req: RequestWithUser, @Body() body: { gigId: number }) {
    return this.ordersService.createOrder(req.user.sub, body.gigId);
  }

  // Static GET routes MUST be before @Get(':id')
  @UseGuards(AuthGuard)
  @Get('my-orders')
  findMyOrders(@Request() req: RequestWithUser) {
    return this.ordersService.findMyOrders(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get('incoming')
  getIncomingOrders(@Request() req: RequestWithUser) {
    return this.ordersService.getIncomingOrders(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  getOrderDetail(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getOrderDetail(id, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Post(':id/initiate-payment')
  initiateMidtransPayment(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.initiateMidtransPayment(id, req.user.sub);
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

  @UseGuards(AuthGuard)
  @Patch(':id/revision')
  requestRevision(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PostRevisionDto,
  ) {
    return this.ordersService.requestRevision(
      id,
      req.user.sub,
      body.revisionNote,
    );
  }

  @UseGuards(AuthGuard)
  @Patch(':id/decline')
  declineOrder(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.ordersService.declineOrder(Number(id), req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/cancel')
  cancelOrder(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelOrder(id, req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Post(':id/upload-payment-proof')
  @UseInterceptors(FileInterceptor('file'))
  uploadPaymentProof(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1024 * 1024 * 5,
            message: 'Ukuran file maksimal adalah 5MB',
          }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.ordersService.uploadPaymentProof(id, req.user.sub, file);
  }

  @UseGuards(AuthGuard)
  @Get(':id/invoice')
  async downloadInvoice(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const buffer = await this.invoiceService.generateInvoice(id, req.user.sub);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-order-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
