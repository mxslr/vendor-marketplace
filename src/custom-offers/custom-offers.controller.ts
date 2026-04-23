import { 
    Controller, Post, Get, Patch, Param, Body, Request, 
    UseGuards, ParseIntPipe, HttpCode, HttpStatus 
} from '@nestjs/common';
import { CustomOffersService } from './custom-offers.service';
import { AuthGuard } from '../auth/auth.guard'; 
import { Decimal } from '@prisma/client/runtime/client';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    name: string;
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
        channelId: string; 
        gigId: number;     
        price: Decimal;     
        title: string; 
        description: string; 
        deadlineDays: number 
    }
  ) {

    return this.customOffersService.createOffer(
        req.user.sub, 
        body.clientId, 
        body.channelId, 
        body
    );
  }

  
  @Get('client')
  async getClientOffers(@Request() req: RequestWithUser) {
    return this.customOffersService.getClientOffers(req.user.sub);
  }

  
  @Patch(':id/accept')
  async acceptOffer(
    @Param('id', ParseIntPipe) id: number, 
    @Request() req: RequestWithUser,
    @Body('messageId') messageId: string 
  ) {
    return this.customOffersService.acceptOffer(id, req.user.sub, messageId);
  }

  @Patch(':id/reject')
  async rejectOffer(
    @Param('id', ParseIntPipe) id: number, 
    @Request() req: RequestWithUser,
    @Body('messageId') messageId: string 
  ) {
    return this.customOffersService.rejectOffer(id, req.user.sub, messageId);
  }
}