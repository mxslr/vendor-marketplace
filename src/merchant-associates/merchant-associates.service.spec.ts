import { Test, TestingModule } from '@nestjs/testing';
import { MerchantAssociatesService } from './merchant-associates.service';

describe('MerchantAssociatesService', () => {
  let service: MerchantAssociatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MerchantAssociatesService],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<MerchantAssociatesService>(MerchantAssociatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
