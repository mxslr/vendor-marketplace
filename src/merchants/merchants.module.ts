import { Module } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { AuthModule } from 'src/auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MerchantAssociatesModule } from '../merchant-associates/merchant-associates.module';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    NotificationsModule,
    MerchantAssociatesModule,
  ],
  providers: [MerchantsService],
  controllers: [MerchantsController],
})
export class MerchantsModule {}
