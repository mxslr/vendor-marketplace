import { Module } from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AppealsController } from './appeals.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  providers: [AppealsService],
  controllers: [AppealsController],
})
export class AppealsModule {}
