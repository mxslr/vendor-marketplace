import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { DeliverablesService } from './deliverables.service';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('deliverables')
export class DeliverablesController {
  constructor(private deliverablesService: DeliverablesService) {}

  @UseGuards(AuthGuard)
  @Post()
  submit(
    @Request() req: RequestWithUser,
    @Body() body: { orderId: number; fileUrl: string; message?: string },
  ) {
    return this.deliverablesService.submitDeliverable(
      req.user.sub,
      body.orderId,
      body.fileUrl,
      body.message,
    );
  }
}
