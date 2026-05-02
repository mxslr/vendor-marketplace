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

import { AddAssociateDto } from './merchant-associates.dto';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('merchant-associates')
export class MerchantAssociatesController {
  constructor(private associatesService: MerchantAssociatesService) {}

  @UseGuards(AuthGuard)
  @Post()
  addAssociate(
    @Request() req: RequestWithUser,
    @Body() dto: AddAssociateDto,
  ) {
    return this.associatesService.addAssociate(
      req.user.sub,
      dto.email,
      dto.permission,
    );
  }

  @UseGuards(AuthGuard)
  @Get()
  getAssociates(@Request() req: RequestWithUser) {
    return this.associatesService.getMyAssociates(req.user.sub);
  }
}
