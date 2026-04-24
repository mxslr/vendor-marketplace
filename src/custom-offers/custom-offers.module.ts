import { Module } from '@nestjs/common';
import { CustomOffersService } from './custom-offers.service';
import { CustomOffersController } from './custom-offers.controller';
import { StreamModule } from 'src/chat/stream.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [StreamModule, AuthModule],
  controllers: [CustomOffersController],
  providers: [CustomOffersService],
})
export class CustomOffersModule {}
