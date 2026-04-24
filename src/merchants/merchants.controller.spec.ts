import { Test, TestingModule } from '@nestjs/testing';
import { MerchantsController } from './merchants.controller';

describe('MerchantsController', () => {
  let controller: MerchantsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<MerchantsController>(MerchantsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
