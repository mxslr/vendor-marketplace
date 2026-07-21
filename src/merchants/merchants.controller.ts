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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MerchantsService } from './merchants.service';
import { MerchantAssociatesService } from '../merchant-associates/merchant-associates.service';
import { AuthGuard } from '../auth/auth.guard';
import { StorageService } from '../storage/storage.service';
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
    private storageService: StorageService,
  ) {}

  private validateImage(
    file?: Express.Multer.File,
    fieldName?: string,
    allowedTypes: RegExp = /(jpg|jpeg|png|webp|pdf)$/i,
  ) {
    if (!file) {
      throw new BadRequestException(`File ${fieldName} tidak boleh kosong!`);
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException(`Ukuran file ${fieldName} maksimal 5MB`);
    }
    if (
      !allowedTypes.test(file.mimetype) &&
      !allowedTypes.test(file.originalname)
    ) {
      throw new BadRequestException(`Format file ${fieldName} tidak valid`);
    }
  }

  // Endpoint: POST /merchants/register - Register user and merchant tanpa login (Publik)
  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  async registerMerchant(
    @Body() dto: RegisterMerchantUserDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
  ) {
    const logoFile = files?.logo?.[0];
    const bannerFile = files?.banner?.[0];

    this.validateImage(logoFile, 'logo', /(jpg|jpeg|png|webp)$/i);
    this.validateImage(bannerFile, 'banner', /(jpg|jpeg|png|webp)$/i);

    const logoUrl = await this.storageService.uploadFile(
      logoFile!,
      'merchant-assets',
    );
    const bannerUrl = await this.storageService.uploadFile(
      bannerFile!,
      'merchant-assets',
    );

    dto.logoUrl = logoUrl;
    dto.bannerUrl = bannerUrl;

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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  async updateProfile(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) _id: number,
    @Body() dto: UpdateProfileDto,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
  ) {
    const logoFile = files?.logo?.[0];
    const bannerFile = files?.banner?.[0];

    if (logoFile) {
      this.validateImage(logoFile, 'logo', /(jpg|jpeg|png|webp)$/i);
      dto.logoUrl = await this.storageService.uploadFile(
        logoFile,
        'merchant-assets',
      );
    }
    if (bannerFile) {
      this.validateImage(bannerFile, 'banner', /(jpg|jpeg|png|webp)$/i);
      dto.bannerUrl = await this.storageService.uploadFile(
        bannerFile,
        'merchant-assets',
      );
    }

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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'kybDocument', maxCount: 1 },
      { name: 'portfolio', maxCount: 1 },
    ]),
  )
  async submitKyb(
    @Request() req: RequestWithUser,
    @Body() dto: SubmitKybDto,
    @UploadedFiles()
    files: {
      kybDocument?: Express.Multer.File[];
      portfolio?: Express.Multer.File[];
    },
  ) {
    const kybFile = files?.kybDocument?.[0];
    const portfolioFile = files?.portfolio?.[0];

    this.validateImage(kybFile, 'kybDocument', /(jpg|jpeg|png|webp|pdf)$/i);
    this.validateImage(
      portfolioFile,
      'portfolio',
      /(jpg|jpeg|png|webp|pdf)$/i,
    );

    const kybDocumentUrl = await this.storageService.uploadFile(
      kybFile!,
      'merchant-kyb',
    );
    const portfolioUrl = await this.storageService.uploadFile(
      portfolioFile!,
      'merchant-portfolio',
    );

    dto.kybDocumentUrl = kybDocumentUrl;
    dto.portfolioUrl = portfolioUrl;

    return this.merchantsService.submitKyb(req.user.sub, dto);
  }

  @UseGuards(AuthGuard)
  @Patch('vacation-mode')
  toggleVacationMode(
    @Request() req: RequestWithUser,
    @Body('isOnVacation') isOnVacation: boolean,
  ) {
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
    return this.associatesService.addAssociate(
      req.user.sub,
      dto.email,
      dto.permission,
    );
  }
}
