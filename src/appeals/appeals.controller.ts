import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
  user: { sub: number; role: string };
}

@UseGuards(AuthGuard)
@Controller('appeals')
export class AppealsController {
  constructor(private appealsService: AppealsService) {}

  @Post()
  createAppeal(
    @Request() req: RequestWithUser,
    @Body() body: { orderId: number; reason: string },
  ) {
    return this.appealsService.createAppeal(req.user.sub, body.orderId, body.reason);
  }

  @Get()
  getAppeals(@Request() req: RequestWithUser) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Hanya Super Admin yang dapat melihat semua banding.');
    }
    return this.appealsService.getAppeals(req.user.sub);
  }

  @Patch(':id/resolve')
  resolveAppeal(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { resolution: string; isApproved: boolean },
  ) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Hanya Super Admin yang dapat memutuskan banding.');
    }
    return this.appealsService.resolveAppeal(req.user.sub, id, body.resolution, body.isApproved);
  }
}
