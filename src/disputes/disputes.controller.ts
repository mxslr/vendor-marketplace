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
  openDispute(
    @Request() req: RequestWithUser,
    @Body() body: { orderId: number; reason: string; evidenceUrls?: string },
  ) {
    return this.disputesService.openDispute(
      req.user.sub,
      body.orderId,
      body.reason,
      body.evidenceUrls,
    );
  }

  @UseGuards(AuthGuard)
  @Patch(':id/resolve')
  resolveDispute(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body()
    body: {
      decision: 'APPROVE_REFUND' | 'REJECT_COMPLAINT';
      verdictNote: string;
    },
  ) {
    return this.disputesService.resolveDispute(
      req.user.sub,
      parseInt(id, 10),
      body.decision,
      body.verdictNote,
    );
  }
}
