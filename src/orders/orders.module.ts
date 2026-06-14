import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { InvoiceService } from './invoice.service';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    SupabaseModule,
    SystemConfigModule,
  ],
  providers: [OrdersService, InvoiceService],
  controllers: [OrdersController],
})
export class OrdersModule {}
