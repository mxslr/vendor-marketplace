import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
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

  @Get(':key')
  get(@Param('key') key: string) {
    return this.systemConfigService.get(key);
  }

  @Put(':key')
  set(
    @Request() req: RequestWithUser,
    @Param('key') key: string,
    @Body() body: { value: string; confirmPassword: string },
  ) {
    return this.systemConfigService.set(req.user.sub, key, body.value, body.confirmPassword);
  }
}
