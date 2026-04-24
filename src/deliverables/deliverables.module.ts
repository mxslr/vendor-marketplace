import { Module } from '@nestjs/common';
import { DeliverablesService } from './deliverables.service';
import { DeliverablesController } from './deliverables.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [DeliverablesService],
  controllers: [DeliverablesController],
})
export class DeliverablesModule {}
