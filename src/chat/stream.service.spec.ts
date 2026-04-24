import { Test, TestingModule } from '@nestjs/testing';
import { StreamService } from './stream.service';
import { ConfigService } from '@nestjs/config';
import { StreamChat } from 'stream-chat';
import { Decimal } from '@prisma/client/runtime/client';

jest.mock('stream-chat');

describe('StreamService', () => {
    let service: StreamService;
    let configService: jest.Mocked<Partial<ConfigService>>;

    const mockServerClient = {
        createToken: jest.fn(),
        upsertUser: jest.fn(),
        channel: jest.fn(),
        getMessage: jest.fn(),
        updateMessage: jest.fn(),
    };

    beforeEach(async () => {
        (StreamChat.getInstance as jest.Mock).mockReturnValue(mockServerClient);

        configService = {
            get: jest.fn((key: string) => {
                if (key === 'STREAM_API_KEY') return 'test-key';
                if (key === 'STREAM_API_SECRET') return 'test-secret';
                return null;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamService,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<StreamService>(StreamService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should throw an error if API keys are missing', () => {
        const noKeyConfigService = {
            get: jest.fn().mockReturnValue(null),
        };
        expect(() => new StreamService(noKeyConfigService as any)).toThrow(
            'Stream API key and secret must be set in environment variables'
        );
    });

    describe('generateToken', () => {
        it('should generate a token for user id', () => {
            mockServerClient.createToken.mockReturnValue('mocked-token');
            const token = service.generateToken('user-1');
            expect(mockServerClient.createToken).toHaveBeenCalledWith('user-1');
            expect(token).toBe('mocked-token');
        });
    });

    describe('upsertStreamUser', () => {
        it('should upsert the given user', async () => {
            await service.upsertStreamUser('1', 'Test Name', 'USER');
            expect(mockServerClient.upsertUser).toHaveBeenCalledWith({
                id: '1',
                name: 'Test Name',
                role_type: 'USER',
            });
        });
    });

    describe('sendOfferAttachment', () => {
        it('should send a custom offer message', async () => {
            const mockChannel = {
                sendMessage: jest.fn().mockResolvedValue('sent'),
            };
            mockServerClient.channel.mockReturnValue(mockChannel);

            const result = await service.sendOfferAttachment('channel-1', 'user-1', {
                offerId: 10,
                gigId: 5,
                price: new Decimal(100) as any,
                title: 'Test Offer',
            });

            expect(mockServerClient.channel).toHaveBeenCalledWith('messaging', 'channel-1');
            expect(mockChannel.sendMessage).toHaveBeenCalledWith({
                text: '📦 Penawaran Baru: Test Offer',
                user_id: 'user-1',
                attachments: [
                    {
                        type: 'custom_offer',
                        offer_id: 10,
                        gig_id: 5,
                        offer_price: expect.anything(),
                        status: 'PENDING',
                    },
                ],
            });
            expect(result).toBe('sent');
        });
    });

    describe('updateOfferStatus', () => {
        it('should update offer status to ACCEPTED', async () => {
            mockServerClient.getMessage.mockResolvedValue({
                message: {
                    attachments: [{ type: 'custom_offer', status: 'PENDING' }],
                },
            });
            mockServerClient.updateMessage.mockResolvedValue('updated');

            const result = await service.updateOfferStatus('msg-1', 'ACCEPTED');

            expect(mockServerClient.updateMessage).toHaveBeenCalledWith({
                id: 'msg-1',
                attachments: [{ type: 'custom_offer', status: 'ACCEPTED' }],
                text: '✅ Penawaran Diterima',
            });
            expect(result).toBe('updated');
        });

        it('should throw an error if no attachments exist', async () => {
            mockServerClient.getMessage.mockResolvedValue({
                message: { attachments: [] },
            });

            await expect(service.updateOfferStatus('msg-1', 'ACCEPTED')).rejects.toThrow(
                'Pesan ini tidak memiliki attachment penawaran.'
            );
        });
    });

    describe('createProductChannel', () => {
        it('should create and return a product channel', async () => {
            const mockChannel = {
                create: jest.fn().mockResolvedValue(true),
            };
            mockServerClient.channel.mockReturnValue(mockChannel);

            const gig = { id: 1, title: 'Gig Title', price: 100, mediaUrls: ['url1'] };
            const result = await service.createProductChannel('client-1', 'assoc-1', 'merch-1', gig);

            expect(mockServerClient.channel).toHaveBeenCalledWith(
                'messaging',
                'chat-gig-1-user-client-1',
                {
                    members: ['client-1', 'assoc-1', 'merch-1'],
                    created_by_id: 'client-1',
                    product_info: { id: '1', title: 'Gig Title', price: 100, image: 'url1' },
                    name: 'Tanya jasa: Gig Title',
                }
            );
            expect(mockChannel.create).toHaveBeenCalled();
            expect(result).toEqual(mockChannel);
        });
    });
});
