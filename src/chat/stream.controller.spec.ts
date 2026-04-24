import { Test, TestingModule } from '@nestjs/testing';
import { StreamController } from './stream.controller';
import { StreamService } from './stream.service';
import { GigsService } from '../gigs/gigs.service';
import { AuthGuard } from '../auth/auth.guard';

describe('StreamController', () => {
    let controller: StreamController;
    let streamService: jest.Mocked<Partial<StreamService>>;
    let gigsService: jest.Mocked<Partial<GigsService>>;

    beforeEach(async () => {
        streamService = {
            upsertStreamUser: jest.fn(),
            generateToken: jest.fn().mockReturnValue('mock-token'),
            createProductChannel: jest.fn().mockResolvedValue({ id: 'mock-channel-id' }),
        };

        gigsService = {
            detailGigs: jest.fn().mockResolvedValue({
                id: 1,
                merchantId: 2,
                merchant: { userId: 3, shopName: 'Shop' },
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [StreamController],
            providers: [
                { provide: StreamService, useValue: streamService },
                { provide: GigsService, useValue: gigsService },
            ],
        })
        .overrideGuard(AuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<StreamController>(StreamController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getToken', () => {
        it('should upsert user and return a token', async () => {
            const mockReq = {
                user: { sub: 1, name: 'Test User', role: 'USER' },
            } as any;

            const result = await controller.getToken(mockReq);

            expect(streamService.upsertStreamUser).toHaveBeenCalledWith('1', 'Test User', 'USER');
            expect(streamService.generateToken).toHaveBeenCalledWith('1');
            expect(result).toEqual({ token: 'mock-token' });
        });
    });

    describe('createChannel', () => {
        it('should create channel successfully', async () => {
            const mockReq = {
                user: { sub: 1, name: 'Client', role: 'USER' },
            } as any;
            const mockBody = { gigId: 1 };

            const result = await controller.createChannel(mockReq, mockBody);

            expect(gigsService.detailGigs).toHaveBeenCalledWith(1);
            expect(streamService.upsertStreamUser).toHaveBeenCalledWith('1', 'Client', 'USER');
            expect(streamService.upsertStreamUser).toHaveBeenCalledWith('3', 'Shop', 'MERCHANT_OWNER');
            expect(streamService.createProductChannel).toHaveBeenCalled();
            expect(result).toEqual({
                channelId: 'mock-channel-id',
                token: 'mock-token',
            });
        });
    });
});
