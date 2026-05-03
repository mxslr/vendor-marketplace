import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { StreamService } from "./stream.service";
import { AuthGuard } from "../auth/auth.guard";
import { GigsService } from "../gigs/gigs.service";

interface RequestWithUser extends Request {
    user: { sub: number; name: string, role: string };
}

// stream.controller.ts
@Controller('chat')
export class StreamController {
    constructor(private readonly streamService: StreamService, private readonly gigsService: GigsService) {}

    @Get('token')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseGuards(AuthGuard)
    async getToken(@Req() req: RequestWithUser) {
        const { sub, name, role } = req.user;
        const userIdString = sub.toString();
        
        await this.streamService.upsertStreamUser(userIdString,  name, role );
        
        const token = this.streamService.generateToken(userIdString);
        
        return { token };
    }

    @Post('create-channel')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(AuthGuard)
    async createChannel(
        @Req() req: any,
        @Body() body: { gigId: any }
    ) {
        const clientId = req.user.sub.toString();
        const clientName = req.user.name ;
        const clientRole = req.user.role;

        const gigIdNumber = Number(body.gigId);
        const gig = await this.gigsService.detailGigs(gigIdNumber);

        const associateId = gig.merchant.userId.toString();
        const shopName = gig.merchant.shopName;

        await this.streamService.upsertStreamUsers([
            { id: clientId, name: clientName, role: clientRole },
            { id: associateId, name: shopName, role: 'MERCHANT_OWNER' },
        ]);

        const channel = await this.streamService.createProductChannel(
            clientId,
            associateId,
            gig,
        );

        return { 
            channelId: channel.id,
            token: this.streamService.generateToken(clientId)
        };
    }
}