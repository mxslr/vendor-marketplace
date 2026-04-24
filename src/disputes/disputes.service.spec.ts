import { Test, TestingModule } from '@nestjs/testing';
import { DisputesService } from './disputes.service';

describe('DisputesService', () => {
  let service: DisputesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DisputesService],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<DisputesService>(DisputesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
