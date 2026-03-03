import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MerchantAssociatesService } from './merchant-associates.service';
import { AuthGuard } from '../auth/auth.guard';
import { AssociatePermission } from '@prisma/client';

@Controller('merchant-associates')
export class MerchantAssociatesController {
  constructor(private associatesService: MerchantAssociatesService) {}

  @UseGuards(AuthGuard)
  @Post()
  addAssociate(
    @Request() req,
    @Body() body: { email: string; permission: AssociatePermission },
  ) {
    return this.associatesService.addAssociate(
      req.user.sub,
      body.email,
      body.permission,
    );
  }

  @UseGuards(AuthGuard)
  @Get()
  getAssociates(@Request() req) {
    return this.associatesService.getMyAssociates(req.user.sub);
  }
}
