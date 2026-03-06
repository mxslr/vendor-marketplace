import { Controller, Post, Get, Patch, Param, Body, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CustomOffersService } from './custom-offers.service';
import { AuthGuard } from '../auth/auth.guard'; 

@Controller('custom-offers')
@UseGuards(AuthGuard)
export class CustomOffersController {
  constructor(private readonly customOffersService: CustomOffersService) {}

  //(Endpoint: POST /custom-offers)
  @Post()
  async createOffer(@Request() req, @Body() body: any) {
    return this.customOffersService.createOffer(req.user.sub, body.clientId, body);
  }

  //(Endpoint: GET /custom-offers/client)
  @Get('client')
  async getClientOffers(@Request() req) {
    return this.customOffersService.getClientOffers(req.user.sub);
  }

  //(Endpoint: PATCH /custom-offers/:id/accept)
  @Patch(':id/accept')
  async acceptOffer(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.customOffersService.acceptOffer(id, req.user.sub);
  }

  //(Endpoint: PATCH /custom-offers/:id/reject)
  @Patch(':id/reject')
  async rejectOffer(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.customOffersService.rejectOffer(id, req.user.sub);
  }
}