import { Test, TestingModule } from '@nestjs/testing';
import { AdminValidatorController } from './admin-validator.controller';

describe('AdminValidatorController', () => {
  let controller: AdminValidatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminValidatorController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<AdminValidatorController>(AdminValidatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
