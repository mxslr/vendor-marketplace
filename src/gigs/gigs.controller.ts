import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  Param,
  Delete,
} from '@nestjs/common';
import { GigsService } from './gigs.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateGigDto, UpdateGigDto } from './gigs.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface RequestWithUsers extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('gigs')
export class GigsController {
  constructor(
    private gigsService: GigsService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Request() req: RequestWithUsers, @Body() dto: CreateGigDto) {
    return this.gigsService.createGig(req.user.sub, dto);
  }

  @Get()
  findAll() {
    return this.gigsService.findAllActiveGigs();
  }

  @UseGuards(AuthGuard)
  @Get('my-gigs')
  findMerchantsGigs(@Request() req: RequestWithUsers) {
    return this.gigsService.findMyGigs(req.user.sub);
  }

  @Get('details/:id')
  async findGigDetails(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authHeader = req.headers.authorization;
    let userPayload: any = null;
    if (authHeader) {
      const [type, token] = authHeader.split(' ') ?? [];
      if (type === 'Bearer' && token) {
        try {
          userPayload = await this.jwtService.verifyAsync(token, {
            secret: this.configService.get<string>('JWT_SECRET'),
          });
        } catch (e) {
          // ignore invalid token for optional auth
        }
      }
    }
    return this.gigsService.detailGigs(id, userPayload);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  updateGig(
    @Request() req: RequestWithUsers,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGigDto,
  ) {
    return this.gigsService.updateGig(req.user.sub, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  removeGig(@Param('id') id: string) {
    return this.gigsService.removeGigs(Number(id));
  }
}

