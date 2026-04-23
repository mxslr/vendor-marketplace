import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  ParseIntPipe,
  UseGuards,
  ForbiddenException
} from '@nestjs/common';
import { FeaturedPlacementService } from './featured-placements.service';
import { CreatePromoteDto, UploadProofDto } from './featured-placements.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Role } from '@prisma/client';

interface RequestWithUsers extends Request {
  user: {
    sub: number;
    role: string;
  }
}

@UseGuards(AuthGuard)
@Controller('featured-placements')
export class FeaturedPlacementController {
  constructor(private readonly service: FeaturedPlacementService) {}

    private checkAdminFinance(role: string) {
          if (role !== Role.ADMIN_FINANCE ) {
              throw new ForbiddenException('Hanya admin finance yang memiliki akses');
          }
      }
  
    private checkMerchant(role: string) {
          if (role !== Role.MERCHANT_OWNER ) {
              throw new ForbiddenException('Hanya toko aktif dengan jasa aktif yang boleh melakukan boosting');
          }
      }

  @Post('promote')
  async createPromote(@Request() req: RequestWithUsers, @Body() dto: CreatePromoteDto) {
    const userId = req.user.sub;
    await this.checkMerchant(req.user.role);
    return this.service.createPromote(userId, dto.gigId);
  }

  @Post('upload-proof/:id')
 async uploadProof(
    @Request() req: RequestWithUsers,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadProofDto,
  ) {
    const userId = req.user.sub;
    await this.checkMerchant(req.user.role);
    return this.service.uploadProof(userId, id, dto.proofUrl);
  }

  @Get('my-promotes')
  async getMyPromotes(@Request() req: RequestWithUsers) {
    const userId = req.user.sub;
    await this.checkMerchant(req.user.role);
    return this.service.getMyPromotes(userId);
  }

  @Post('admin/approve/:id')
  async approveFeature(@Request() req: RequestWithUsers, @Param('id', ParseIntPipe) id: number) {
    await this.checkAdminFinance(req.user.role);
    return this.service.approveFeature(id);
  }

  @Post('admin/reject/:id')
  async rejectFeature(@Request() req: RequestWithUsers, @Param('id', ParseIntPipe) id: number) {
   await this.checkAdminFinance(req.user.role);
    return this.service.rejectFeature(id);
  }

 
  @Get('admin/pending')
  async getPendingFeatures(@Request() req: RequestWithUsers) {
    await this.checkAdminFinance(req.user.role);
    return this.service.getPendingFeatures();
  }
}