import { Controller, Get, Patch, Body, Param, UseGuards, Request, Req, ForbiddenException, ParseIntPipe } from '@nestjs/common';
import { AdminValidatorService } from './admin-validator.service';
import { AuthGuard } from '../auth/auth.guard';

interface RequestWithUser extends Request {
    user: { sub: number; role: string };
}

@Controller('admin/validator')
export class AdminValidatorController {
    constructor(private adminValidatorService: AdminValidatorService) {}

    private async checkValidatorRole(role: string) {
        if (role !== 'ADMIN_VALIDATOR' && role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Akses ditolak. Area khusus Admin Validator.');
        }
    }
    
    @UseGuards(AuthGuard)
    @Get('merchants/pending')
     getPendingMerchants(@Request() req: RequestWithUser) {
    this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.getPendingMerchants();
    }
    @UseGuards(AuthGuard)
    @Get('gigs/pending')
    async getPendingGigs(@Request() req: RequestWithUser){
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.getPendingGigs();
    }
    @UseGuards(AuthGuard)
    @Patch('merchants/:id/verify')
    async verifyMerchant(
        @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isApproved: boolean; rejectionReason?: string }
    ) {
    await this.checkValidatorRole(req.user.role);
    return this.adminValidatorService.verifyMerchant(
        id,
        body.isApproved,
        body.rejectionReason
    );
    }

    @UseGuards(AuthGuard)
    @Patch('gigs/:id/verify')
    async verifyGig(
        @Request() req: RequestWithUser,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { isApproved: boolean; rejectionReason?: string }
    ) {
        await this.checkValidatorRole(req.user.role);
        return this.adminValidatorService.verifyGig(
            id,
            body.isApproved,
            body.rejectionReason
         );
        }
    @UseGuards(AuthGuard)
    @Patch('merchants/:id/suspend')
    async suspendMerchant(
        @Request() req: RequestWithUser,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { isSuspended: boolean , reason?: string; days?: number}
    ) {
        await this.checkValidatorRole(req.user.role);
        return this.adminValidatorService.suspendMerchant(
            body.isSuspended,
            id,
            body.reason,
            body.days
        );
    }
}