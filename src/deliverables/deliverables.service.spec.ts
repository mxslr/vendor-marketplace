import { Test, TestingModule } from '@nestjs/testing';
import { DeliverablesService } from './deliverables.service';

describe('DeliverablesService', () => {
  let service: DeliverablesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliverablesService],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<DeliverablesService>(DeliverablesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
