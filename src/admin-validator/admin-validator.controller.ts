import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Req,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  AdminValidatorService,
  ExecutiveDecisionType,
} from './admin-validator.service';
import { AuthGuard } from '../auth/auth.guard';
import { MerchantStatus, Role } from '@prisma/client';
import { ResolveDisputeDto } from './dto/resolve-disputes.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

interface RequestWithUser extends Request {
  user: { sub: number; role: string };
}

@Controller('admin/validator')
export class AdminValidatorController {
  constructor(private adminValidatorService: AdminValidatorService) {}

  private async checkValidatorRole(role: string) {
    if (role !== 'ADMIN_VALIDATOR' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Akses ditolak. Area khusus Admin Validator.',
      );
    }
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN_VALIDATOR)
  @Get('merchants/pending')
  async getPendingMerchants(@Request() req: RequestWithUser) {
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.getPendingMerchants();
  }
  @UseGuards(AuthGuard)
  @Get('gigs/pending')
  async getPendingGigs(@Request() req: RequestWithUser) {
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.getPendingGigs();
  }
  @UseGuards(AuthGuard)
  @Patch('merchants/:id/verify')
  async verifyMerchant(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isApproved: boolean; rejectionReason?: string },
  ) {
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.verifyMerchant(
      id,
      body.isApproved,
      body.rejectionReason,
    );
  }

  @UseGuards(AuthGuard)
  @Patch('gigs/:id/verify')
  async verifyGig(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isApproved: boolean; rejectionReason?: string },
  ) {
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.verifyGig(
      id,
      body.isApproved,
      body.rejectionReason,
    );
  }
  @UseGuards(AuthGuard)
  @Patch('merchants/:id/suspend')
  async suspendMerchant(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isSuspended: boolean; reason?: string; days?: number },
  ) {
    await this.checkValidatorRole(req.user.role);
    if (body.isSuspended === false && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Hanya Super Admin yang dapat mencabut suspend akun.',
      );
    }
    return this.adminValidatorService.suspendMerchant(
      body.isSuspended,
      id,
      body.reason,
      body.days,
    );
  }

  @UseGuards(AuthGuard)
  @Patch('users/:id/suspend')
  async suspendUser(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isSuspended: boolean; reason?: string; days?: number },
  ) {
    await this.checkValidatorRole(req.user.role);
    if (body.isSuspended === false && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Hanya Super Admin yang dapat mencabut suspend akun.',
      );
    }
    return this.adminValidatorService.suspendUser(
      req.user.sub,
      body.isSuspended,
      id,
      body.reason,
      body.days,
    );
  }
  @UseGuards(AuthGuard)
  @Get('disputes/pending')
  async getPendingDisputes(@Request() req: RequestWithUser) {
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.getPendingDisputes();
  }

  @UseGuards(AuthGuard)
  @Patch('disputes/:id/executive-decision')
  async executiveDecision(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { decision: ExecutiveDecisionType },
  ) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Hanya Super Admin yang bisa membuat Executive Decision.',
      );
    }
    return this.adminValidatorService.executiveDecision(
      req.user.sub,
      id,
      body.decision,
    );
  }

  @UseGuards(AuthGuard)
  @Patch('disputes/:id/submit-verdict')
  async submitVerdict(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ResolveDisputeDto,
  ) {
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.submitVerdict(
      req.user.sub,
      id,
      body.decision,
    );
  }

  @UseGuards(AuthGuard)
  @Patch('disputes/:id/confirm-verdict')
  async confirmVerdict(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.confirmVerdict(req.user.sub, id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/resolve')
  async resolveDispute(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body()
    body: ResolveDisputeDto,
  ) {
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.resolveDispute(
      req.user.sub,
      parseInt(id, 10),
      body.decision,
    );
  }
}
