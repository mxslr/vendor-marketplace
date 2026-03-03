import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GigsService } from './gigs.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateGigDto } from './gigs.dto';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('gigs')
export class GigsController {
  constructor(private gigsService: GigsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Request() req: RequestWithUser, @Body() dto: CreateGigDto) {
    return this.gigsService.createGig(req.user.sub, dto);
  }

  @Get()
  findAll() {
    return this.gigsService.findAllActiveGigs();
  }
}
