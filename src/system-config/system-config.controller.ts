import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Post,
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: { sub: number; role: string };
}

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('system-config')
export class SystemConfigController {
  constructor(private systemConfigService: SystemConfigService) {}

  @Get()
  getAll() {
    return this.systemConfigService.getAll();
  }

  @Get('audit-logs')
  getAuditLogs(@Request() req: RequestWithUser) {
    return this.systemConfigService.getAuditLogs(req.user.sub);
  }

  @Get('users')
  getUsersByStatus(
    @Request() req: RequestWithUser,
    @Query('status') status?: 'active' | 'suspended',
  ) {
    return this.systemConfigService.getUsersByStatus(req.user.sub, status);
  }

  @Get('midtrans/health')
  getHealthCheckMidtrans() {
    return this.systemConfigService.getHealthCheckMidtrans();
  }

  @Get('analytics')
  getTransactionAnalytics(
    @Request() req: RequestWithUser,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    return this.systemConfigService.getTransactionAnalytics(
      req.user.sub,
      period,
    );
  }

  @Get('maintenance')
  async isMaintenanceMode(@Request() req: RequestWithUser) {
    return this.systemConfigService.isMaintenanceMode(req.user.sub);
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.systemConfigService.get(key);
  }

  @Post('create-admin')
  async createAdminValidatorOrAdminFinance(
    @Request() req: RequestWithUser,
    @Body()
    body: { email: string; passwordHash: string; fullName: string; role: Role },
  ) {
    return this.systemConfigService.createAdminValidatorOrAdminFinance(
      req.user.sub,
      body.email,
      body.fullName,
      body.passwordHash,
      body.role,
    );
  }

  @Post('suspend-admin')
  async suspendAdmin(
    @Request() req: RequestWithUser,
    @Body() body: { userId: number },
  ) {
    return this.systemConfigService.suspendAdmin(req.user.sub, body.userId);
  }

  @Post('unsuspend-admin')
  async unsuspendAdmin(
    @Request() req: RequestWithUser,
    @Body() body: { userId: number },
  ) {
    return this.systemConfigService.unsuspendAdmin(req.user.sub, body.userId);
  }

  @Post('delete-admin')
  async deleteAdmin(
    @Request() req: RequestWithUser,
    @Body() body: { userId: number },
  ) {
    return this.systemConfigService.deleteAdmin(req.user.sub, body.userId);
  }

  @Put(':key')
  set(
    @Request() req: RequestWithUser,
    @Param('key') key: string,
    @Body() body: { value: string; confirmPassword: string },
  ) {
    return this.systemConfigService.set(
      req.user.sub,
      key,
      body.value,
      body.confirmPassword,
    );
  }
}
