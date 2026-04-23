import { 
    Controller, Post, Get, Patch, Param, Body, Request, 
    UseGuards, ParseIntPipe, HttpCode, HttpStatus 
} from '@nestjs/common';
import { CustomOffersService } from './custom-offers.service';
import { AuthGuard } from '../auth/auth.guard'; 

interface RequestWithUsers extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('custom-offers')
@UseGuards(AuthGuard)
export class CustomOffersController {
  constructor(private readonly customOffersService: CustomOffersService) {}

  @Post('sent')
  @HttpCode(HttpStatus.CREATED)
  async createOffer(
    @Request() req: RequestWithUser, 
    @Body() body: { 
        clientId: number; 
        channelId: string; // ID Channel Chat Stream
        gigId: number;     // ID Jasa yang mau ditawar
        price: number;     // Harga nego
        title: string; 
        description: string; 
        deadlineDays: number 
    }
  ) {
    // Kita lempar channelId juga supaya service bisa otomatis kirim balon chat
    return this.customOffersService.createOffer(
        req.user.sub, 
        body.clientId, 
        body.channelId, 
        body
    );
  }

  /**
   * 2. LIST OFFERS (Untuk Pembeli)
   * Melihat daftar penawaran yang masuk ke akun pembeli
   */
  @Get('client')
  async getClientOffers(@Request() req: RequestWithUser) {
    return this.customOffersService.getClientOffers(req.user.sub);
  }

  /**
   * 3. ACCEPT OFFER (Oleh Pembeli)
   * Menyetujui harga nego -> Otomatis bikin Order UNPAID
   */
  @Patch(':id/accept')
  async acceptOffer(
    @Param('id', ParseIntPipe) id: number, 
    @Request() req: RequestWithUser,
    @Body('messageId') messageId: string // Diambil dari ID pesan di chat Stream
  ) {
    // Service bakal update status Prisma DAN update balon chat Stream
    return this.customOffersService.acceptOffer(id, req.user.sub, messageId);
  }

  /**
   * 4. REJECT OFFER (Oleh Pembeli)
   * Menolak penawaran harga nego
   */
  @Patch(':id/reject')
  async rejectOffer(
    @Param('id', ParseIntPipe) id: number, 
    @Request() req: RequestWithUser,
    @Body('messageId') messageId: string // Diambil dari ID pesan di chat Stream
  ) {
    // Service bakal update status Prisma DAN ubah teks balon chat jadi "REJECTED"
    return this.customOffersService.rejectOffer(id, req.user.sub, messageId);
  }
}