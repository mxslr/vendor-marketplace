import { Module } from '@nestjs/common';
import { MonthlyReportService } from './monthly-report.service';
import { MonthlyReportController } from './monthly-report.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, AuthModule, EmailModule],
  controllers: [MonthlyReportController],
  providers: [MonthlyReportService],
  exports: [MonthlyReportService],
})
export class MonthlyReportModule {}
