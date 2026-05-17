import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
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
    const allowedRoles = ['ADMIN_VALIDATOR', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenException(
        'Hanya Admin Validator atau Super Admin yang dapat membuka tiket sengketa.',
      );
    }
    return this.disputesService.openDispute(
      req.user.sub,
      body.orderId,
      body.reason,
      body.evidenceUrls,
    );
  }
}
