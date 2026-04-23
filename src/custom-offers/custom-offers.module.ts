import { Module } from '@nestjs/common';
import { CustomOffersService } from './custom-offers.service';
import { CustomOffersController } from './custom-offers.controller';
import { StreamModule } from 'src/chat/stream.module';

@Module({
  imports: [StreamModule],
  controllers: [CustomOffersController],
  providers: [CustomOffersService],
})
export class CustomOffersModule {}
