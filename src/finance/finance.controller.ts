import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: { sub: number; role: string };
}

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN_FINANCE)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('profile/activity-log')
  async getProfileActivityLog(@Request() req: RequestWithUser) {
    return this.financeService.getProfileActivityLog(req.user.sub);
  }

  @Patch('profile')
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.financeService.updateProfile(req.user.sub, dto);
  }
}
