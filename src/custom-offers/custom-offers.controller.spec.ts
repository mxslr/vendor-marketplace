import { Test, TestingModule } from '@nestjs/testing';
import { CustomOffersController } from './custom-offers.controller';
import { CustomOffersService } from './custom-offers.service';

describe('CustomOffersController', () => {
  let controller: CustomOffersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomOffersController],
      providers: [CustomOffersService],
    }).compile();

    controller = module.get<CustomOffersController>(CustomOffersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
