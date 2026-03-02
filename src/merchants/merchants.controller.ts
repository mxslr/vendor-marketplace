import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  CreateMerchantDto,
  SubmitKybDto,
  UpdateProfileDto,
} from './merchants.dto';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('merchants')
export class MerchantsController {
  constructor(private merchantsService: MerchantsService) {}

  // Endpoint: POST /merchants
  @UseGuards(AuthGuard)
  @Post()
  create(@Request() req: RequestWithUser, @Body() dto: CreateMerchantDto) {
    return this.merchantsService.createMerchant(req.user.sub, dto);
  }

  // Endpoint: GET /merchants
  @Get()
  findAll() {
    return this.merchantsService.findAllMerchants();
  }
  // Endpoint: GET /merchants/me untuk melihat profil toko sendiri (Hanya Merchant)
  @UseGuards(AuthGuard)
  @Get('me')
  findMyMerchant(@Request() req: RequestWithUser) {
    return this.merchantsService.findMerchantByUserId(req.user.sub);
  }
  // Endpoint: GET /merchants/:id untuk melihat profil toko lain (Publik)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.findMerchantById(id);
  }
  // Edit Profil Toko (Hanya Merchant)
  @UseGuards(AuthGuard)
  @Patch('profile')
  updateProfile(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.merchantsService.updateProfileMerchant(req.user.sub, dto);
  }

  // Endpoint: PATCH /merchants/submit-kyb
  @UseGuards(AuthGuard)
  @Patch('submit-kyb')
  submitKyb(@Request() req: RequestWithUser, @Body() dto: SubmitKybDto) {
    return this.merchantsService.submitKyb(req.user.sub, dto);
  }

  // Endpoint: PATCH /merchants/:id/approve Approval dari Admin
  @UseGuards(AuthGuard)
  @Patch(':id/approve')
  approve(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkAdminRole(req.user.role);
    return this.merchantsService.approveMerchant(id);
  }

  // Endpoint: PATCH /merchants/:id/reject Rejection dari Admin dengan alasan
  @UseGuards(AuthGuard)
  @Patch(':id/reject')
  reject(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkAdminRole(req.user.role);
    return this.merchantsService.rejectMerchant(id);
  }

  private checkAdminRole(role: string) {
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN_VALIDATOR') {
      throw new UnauthorizedException('Akses ditolak. Fitur khusus Admin.');
    }
  }
}
