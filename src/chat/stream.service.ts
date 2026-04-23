import { Injectable } from '@nestjs/common'
import { Attachment, StreamChat, User } from 'stream-chat'
import { ConfigService } from '@nestjs/config'
import { Decimal } from '@prisma/client/runtime/client';

    interface CustomOfferAttachment extends Attachment {
    status?: string;
    offer_id?: number;
    offer_price?: Decimal;
}

    @Injectable()
    export class StreamService {
        private serverClient: StreamChat;

        constructor(private configService: ConfigService) {
            const apiKey = this.configService.get<string>('STREAM_API_KEY')
            const apiSecret = this.configService.get<string>('STREAM_API_SECRET')

            if (!apiKey || !apiSecret) {
                throw new Error('Stream API key and secret must be set in environment variables')
            }

            if (typeof apiKey !== 'string' || typeof apiSecret !== 'string') {
                throw new Error('Stream API key and secret is incorrect format')
            }

            this.serverClient = StreamChat.getInstance(apiKey!, apiSecret!)
        }

        generateToken(userId: string) {
            return this.serverClient.createToken(userId);
        }

        async upsertStreamUser(userId: string, fullName: string, role: string) {
            await this.serverClient.upsertUser({
                id: userId,
                name: fullName,
                role_type: role
            }as any)
        }

        async sendOfferAttachment(channelId: string, senderId: string, offer: { offerId: number, price: Decimal, title: string }) {
        const channel = this.serverClient.channel('messaging', channelId);
        
        return await channel.sendMessage({
            text: `📦 Penawaran Baru: ${offer.title}`,
            user_id: senderId,
            attachments: [
                {
                    type: 'custom_offer',
                    offer_id: offer.offerId, 
                    offer_price: offer.price,
                    status: 'PENDING', 
                },
            ],
        } as any);
    }

    async updateOfferStatus(messageId: string, status: 'ACCEPTED' | 'REJECTED') {
        const { message } = await this.serverClient.getMessage(messageId);
        
        if (!message.attachments || message.attachments.length === 0) {
            throw new Error('Pesan ini tidak memiliki attachment penawaran.');
        }

        const attachment = message.attachments[0] as CustomOfferAttachment;
        attachment.status = status;

        return await this.serverClient.updateMessage({
            id: messageId,
            attachments: [attachment],
            text: status === 'ACCEPTED' ? '✅ Penawaran Diterima' : '❌ Penawaran Ditolak',
        } as any);
    }


        async createProductChannel(clientId: string, associateId: string, merchantId: string, gig: any){
            const channelId = `chat-gig-${gig.id}-user-${clientId}`;

            const channel = this.serverClient.channel('messaging', channelId, {
                members: [clientId, associateId, merchantId],
                created_by_id: clientId,

                product_info: {
                    id: gig.id.toString(),
                    title: gig.title,
                    price: gig.price,
                    image: gig.mediaUrls?.[0] || ''
                },
                name: `Tanya jasa: ${gig.title}`
            }as any);

            await channel.create();
            return channel
        }
    }