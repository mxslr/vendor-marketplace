import { Module } from '@nestjs/common';
import { CustomOffersService } from './custom-offers.service';
import { CustomOffersController } from './custom-offers.controller';

@Module({
  controllers: [CustomOffersController],
  providers: [CustomOffersService],
})
export class CustomOffersModule {}
