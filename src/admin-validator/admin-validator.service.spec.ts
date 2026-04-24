import { Test, TestingModule } from '@nestjs/testing';
import { AdminValidatorService } from './admin-validator.service';

describe('AdminValidatorService', () => {
  let service: AdminValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminValidatorService],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<AdminValidatorService>(AdminValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
