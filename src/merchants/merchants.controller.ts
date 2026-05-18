import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { MerchantAssociatesService } from '../merchant-associates/merchant-associates.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  SubmitKybDto,
  UpdateProfileDto,
  RegisterMerchantUserDto,
} from './merchants.dto';
import { AddAssociateDto } from '../merchant-associates/merchant-associates.dto';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('merchants')
export class MerchantsController {
  constructor(
    private merchantsService: MerchantsService,
    private associatesService: MerchantAssociatesService,
  ) {}

  // Endpoint: POST /merchants/register - Register user and merchant tanpa login (Publik)
  @Post('register')
  registerMerchant(@Body() dto: RegisterMerchantUserDto) {
    return this.merchantsService.registerNewMerchant(dto);
  }

  // Endpoint: GET /merchants
  @Get()
  findAll() {
    return this.merchantsService.findAllMerchants();
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.merchantsService.getLeaderboard();
  }
  // Endpoint: GET /merchants/profile untuk melihat profil toko sendiri (Hanya Merchant)
  @UseGuards(AuthGuard)
  @Get('profile')
  findMyMerchant(@Request() req: RequestWithUser) {
    return this.merchantsService.findMyMerchantByUserId(req.user.sub);
  }
  // Endpoint: GET /merchants/:id untuk melihat profil toko lain (Publik)
  @Get('details/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.findMerchantById(id);
  }
  // Edit Profil Toko (Hanya Merchant)
  @UseGuards(AuthGuard)
  @Patch(':id/edit/profile')
  updateProfile(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.merchantsService.updateProfileMerchant(req.user.sub, dto);
  }

  // Endpoint: PATCH /merchants/kyb/acknowledge-rejection
  @UseGuards(AuthGuard)
  @Patch('kyb/acknowledge-rejection')
  acknowledgeKybRejection(@Request() req: RequestWithUser) {
    return this.merchantsService.acknowledgeKybRejection(req.user.sub);
  }

  // Endpoint: PATCH /merchants/submit-kyb
  @UseGuards(AuthGuard)
  @Patch('submit-kyb')
  submitKyb(@Request() req: RequestWithUser, @Body() dto: SubmitKybDto) {
    return this.merchantsService.submitKyb(req.user.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Patch('vacation-mode')
  toggleVacationMode(
    @Request() req: RequestWithUser,
    @Body('isOnVacation') isOnVacation: boolean,) {
    return this.merchantsService.toggleVacationMode(req.user.sub, isOnVacation);
    }
  
  @UseGuards(AuthGuard)
  @Patch('closed')
  closeMerchant(@Request() req: RequestWithUser) {
    return this.merchantsService.closeMerchant(req.user.sub);
  }

  // RESTful alias for POST /merchant-associates
  // AUTH-05: Merchant menambah associate via POST /merchants/:id/associates
  @UseGuards(AuthGuard)
  @Post(':id/associates')
  addAssociate(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) _merchantId: number,
    @Body() dto: AddAssociateDto,
  ) {
    return this.associatesService.addAssociate(req.user.sub, dto.email, dto.permission);
  }
}
