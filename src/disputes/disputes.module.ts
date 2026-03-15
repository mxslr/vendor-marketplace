import { Module } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { DisputesController } from './disputes.controller';

@Module({
  providers: [DisputesService],
  controllers: [DisputesController],
})
export class DisputesModule {}
