import { Controller, Post, Get, Body, UseGuards, Request, ParseIntPipe, Param, Delete} from '@nestjs/common';
import { GigsService } from './gigs.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateGigDto } from './gigs.dto';

interface RequestWithUsers extends Request {
  user: {
    sub: number;
    role: string;
  }
}

@Controller('gigs')
export class GigsController {
  constructor(private gigsService: GigsService) {}

@UseGuards(AuthGuard)
@Post()
  create(@Request() req: RequestWithUsers, @Body() dto: CreateGigDto ) {
    return this.gigsService.createGig(req.user.sub, dto);
  }

@Get()
  findAll() {
    return this.gigsService.findAllActiveGigs();
  }

@Get('merchant/:id')
  findMerchantsGigs(@Param('id', ParseIntPipe) id: number) {
    return this.gigsService.findMyGigs(id)
  }
  
@Get('details/:id')
  findGigDetails(@Param('id', ParseIntPipe) id: number ){
      return this.gigsService.detailGigs(id)
    }
    
@UseGuards(AuthGuard)
@Delete(':id')
removeGig(@Param('id') id: string) {
  return this.gigsService.removeGigs(Number(id));
}
}

