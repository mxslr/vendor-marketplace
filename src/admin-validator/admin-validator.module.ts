import { Module } from '@nestjs/common';
import { AdminValidatorService } from './admin-validator.service';
import { AdminValidatorController } from './admin-validator.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [AdminValidatorService],
  controllers: [AdminValidatorController],
})
export class AdminValidatorModule {}
