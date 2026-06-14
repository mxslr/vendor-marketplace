import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
  user: { sub: number; role: string };
}

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(@Request() req: RequestWithUser) {
    return this.notificationsService.getMyNotifications(req.user.sub);
  }

  @Patch(':id/read')
  markAsRead(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(req.user.sub, id);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: RequestWithUser) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }
}
