import { Module } from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AppealsController } from './appeals.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [AppealsService],
  controllers: [AppealsController],
})
export class AppealsModule {}
