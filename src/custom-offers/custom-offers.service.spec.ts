import { Test, TestingModule } from '@nestjs/testing';
import { CustomOffersService } from './custom-offers.service';

describe('CustomOffersService', () => {
  let service: CustomOffersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomOffersService],
    }).compile();

    service = module.get<CustomOffersService>(CustomOffersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
