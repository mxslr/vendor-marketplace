import { Module } from '@nestjs/common';
import { DeliverablesService } from './deliverables.service';
import { DeliverablesController } from './deliverables.controller';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AuthModule, NotificationsModule, StorageModule],
  providers: [DeliverablesService],
  controllers: [DeliverablesController],
})
export class DeliverablesModule {}
