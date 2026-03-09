import { Module } from '@nestjs/common';
import { MerchantAssociatesService } from './merchant-associates.service';
import { MerchantAssociatesController } from './merchant-associates.controller';

@Module({
  providers: [MerchantAssociatesService],
  controllers: [MerchantAssociatesController],
})
export class MerchantAssociatesModule {}
