import { Module } from '@nestjs/common';
import { AdminValidatorService } from './admin-validator.service';
import { AdminValidatorController } from './admin-validator.controller';

@Module({
  providers: [AdminValidatorService],
  controllers: [AdminValidatorController],
})
export class AdminValidatorModule {}
