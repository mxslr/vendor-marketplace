import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Request,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { MonthlyReportService } from './monthly-report.service';
import {
  GenerateReportDto,
  UpdateOperationalCostDto,
  ProcessDividendDto,
  UploadProofDto,
  MonthlyReportResponseDto,
} from './monthly-report.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@UseGuards(AuthGuard)
@Controller('monthly-reports')
export class MonthlyReportController {
  constructor(private readonly service: MonthlyReportService) {}

  private checkAdminFinance(role: string) {
    if (role !== Role.ADMIN_FINANCE) {
      throw new ForbiddenException('Only Finance Admin can access this resource');
    }
  }

  @Post('generate')
  async generateReport(
    @Request() req: RequestWithUser,
    @Body() dto: GenerateReportDto,
  ): Promise<MonthlyReportResponseDto> {
    this.checkAdminFinance(req.user.role);
    return this.service.generateReport(dto);
  }

  @Patch(':id/operational-cost')
  async updateOperationalCost(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOperationalCostDto,
  ): Promise<MonthlyReportResponseDto> {
    this.checkAdminFinance(req.user.role);
    return this.service.updateOperationalCost(id, dto);
  }

  @Post(':id/process-dividend')
  async processDividend(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessDividendDto,
  ): Promise<MonthlyReportResponseDto> {
    this.checkAdminFinance(req.user.role);
    return this.service.processDividend(id, dto);
  }

  @Post(':id/lock')
  async lockReport(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MonthlyReportResponseDto> {
    this.checkAdminFinance(req.user.role);
    return this.service.lockReport(id);
  }

  @Post(':id/upload-proof')
  async uploadProof(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadProofDto,
  ): Promise<MonthlyReportResponseDto> {
    this.checkAdminFinance(req.user.role);
    return this.service.uploadProof(id, dto);
  }

  @Get()
  async getReports(@Request() req: RequestWithUser): Promise<MonthlyReportResponseDto[]> {
    this.checkAdminFinance(req.user.role);
    return this.service.getReports();
  }

  @Get(':id')
  async getReportById(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MonthlyReportResponseDto> {
    this.checkAdminFinance(req.user.role);
    return this.service.getReportById(id);
  }
}
