import { Module } from '@nestjs/common';
import { DeliverablesService } from './deliverables.service';
import { DeliverablesController } from './deliverables.controller';

@Module({
  providers: [DeliverablesService],
  controllers: [DeliverablesController],
})
export class DeliverablesModule {}
