import { Module } from '@nestjs/common';
import { MonthlyReportService } from './monthly-report.service';
import { MonthlyReportController } from './monthly-report.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MonthlyReportController],
  providers: [MonthlyReportService],
  exports: [MonthlyReportService],
})
export class MonthlyReportModule {}
