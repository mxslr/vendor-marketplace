import { Test, TestingModule } from '@nestjs/testing';
import { DisputesController } from './disputes.controller';

describe('DisputesController', () => {
  let controller: DisputesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisputesController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<DisputesController>(DisputesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
