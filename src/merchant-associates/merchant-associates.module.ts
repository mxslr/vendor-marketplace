import { Module } from '@nestjs/common';
import { MerchantAssociatesService } from './merchant-associates.service';
import { MerchantAssociatesController } from './merchant-associates.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports:[AuthModule],
  providers: [MerchantAssociatesService],
  controllers: [MerchantAssociatesController],
})
export class MerchantAssociatesModule {}
