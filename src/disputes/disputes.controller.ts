import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { AuthGuard } from '../auth/auth.guard';
import { OpenDisputesDto } from './dto/open-disputes.dto';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('disputes')
export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  @UseGuards(AuthGuard)
  @Post()
  openDispute(@Request() req: RequestWithUser, @Body() body: OpenDisputesDto) {
    return this.disputesService.openDispute(
      req.user.sub,
      body.orderId,
      body.reason,
      body.evidenceUrls,
    );
  }
}
