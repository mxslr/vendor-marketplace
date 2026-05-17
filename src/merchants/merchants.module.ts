import { Module } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { AuthModule } from 'src/auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, SupabaseModule, NotificationsModule],
  providers: [MerchantsService],
  controllers: [MerchantsController],
})
export class MerchantsModule {}
