import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { DeliverablesService } from './deliverables.service';
import { AuthGuard } from '../auth/auth.guard';
import { SubmitDeliverableDto } from './dto/submit-deliverable.dto';

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
    @Body() body: SubmitDeliverableDto,
  ) {
    return this.deliverablesService.submitDeliverable(
      req.user.sub,
      body.orderId,
      body.fileUrl,
      body.message,
    );
  }
}
