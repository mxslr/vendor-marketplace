import { Module } from '@nestjs/common';
import { CustomOffersService } from './custom-offers.service';
import { CustomOffersController } from './custom-offers.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomOffersController],
  providers: [CustomOffersService],
})
export class CustomOffersModule {}