import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminValidatorService } from './admin-validator.service';
import { AuthGuard } from '../auth/auth.guard';
import { MerchantStatus } from '@prisma/client'; 

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}
@Controller('admin/validator')
export class AdminValidatorController {
  constructor(private adminValidatorService: AdminValidatorService) {}

  @UseGuards(AuthGuard)
  @Get('merchants/pending')
  getPendingMerchants(@Request() req: RequestWithUser) {
    return this.adminValidatorService.getPendingMerchants(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch('merchants/:id/verify')
  verifyMerchant(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: { status: MerchantStatus; rejectionReason?: string }, 
  ) {
    return this.adminValidatorService.verifyMerchant(
      req.user.sub,
      parseInt(id, 10),
      body.status, 
      body.rejectionReason,
    );
  }
}