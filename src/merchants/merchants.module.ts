import { Module } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';

@Module({
  providers: [MerchantsService],
  controllers: [MerchantsController],
})
export class MerchantsModule {}
