import { Test, TestingModule } from '@nestjs/testing';
import { MerchantAssociatesController } from './merchant-associates.controller';

describe('MerchantAssociatesController', () => {
  let controller: MerchantAssociatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantAssociatesController],
    }).compile();

    controller = module.get<MerchantAssociatesController>(
      MerchantAssociatesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
