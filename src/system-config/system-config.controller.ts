import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
  user: { sub: number; role: string };
}

@UseGuards(AuthGuard)
@Controller('system-config')
export class SystemConfigController {
  constructor(private systemConfigService: SystemConfigService) {}

  @Get()
  getAll(@Request() req: RequestWithUser) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Akses ditolak.');
    }
    return this.systemConfigService.getAll();
  }

  @Get(':key')
  get(@Request() req: RequestWithUser, @Param('key') key: string) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Akses ditolak.');
    }
    return this.systemConfigService.get(key);
  }

  @Put(':key')
  set(
    @Request() req: RequestWithUser,
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Akses ditolak.');
    }
    return this.systemConfigService.set(req.user.sub, key, body.value);
  }
}
