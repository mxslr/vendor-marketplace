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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GigsService } from './gigs.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateGigDto, UpdateGigDto } from './gigs.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';

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
    private storageService: StorageService,
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('media'))
  async create(
    @Request() req: RequestWithUsers,
    @Body() dto: CreateGigDto,
    @UploadedFile() mediaFile?: Express.Multer.File,
  ) {
    if (mediaFile) {
      if (mediaFile.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Ukuran file media maksimal 5MB');
      }
      dto.mediaUrls = await this.storageService.uploadFile(
        mediaFile,
        'gig-media',
      );
    }
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
  async findGigDetails(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
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
  @UseInterceptors(FileInterceptor('media'))
  async updateGig(
    @Request() req: RequestWithUsers,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGigDto,
    @UploadedFile() mediaFile?: Express.Multer.File,
  ) {
    if (mediaFile) {
      if (mediaFile.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Ukuran file media maksimal 5MB');
      }
      dto.mediaUrls = await this.storageService.uploadFile(
        mediaFile,
        'gig-media',
      );
    }
    return this.gigsService.updateGig(req.user.sub, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  removeGig(@Param('id') id: string) {
    return this.gigsService.removeGigs(Number(id));
  }
}

