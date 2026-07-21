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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { StorageService } from '../storage/storage.service';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@UseGuards(AuthGuard)
@Controller('monthly-reports')
export class MonthlyReportController {
  constructor(
    private readonly service: MonthlyReportService,
    private readonly storageService: StorageService,
  ) {}

  private checkAdminFinance(role: string) {
    if (role !== Role.ADMIN_FINANCE) {
      throw new ForbiddenException(
        'Only Finance Admin can access this resource',
      );
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
  @UseInterceptors(FileInterceptor('proof'))
  async uploadProof(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadProofDto,
    @UploadedFile() proofFile?: Express.Multer.File,
  ): Promise<MonthlyReportResponseDto> {
    this.checkAdminFinance(req.user.role);

    if (!proofFile) {
      throw new BadRequestException('File bukti transfer (proof) tidak boleh kosong!');
    }
    if (proofFile.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Ukuran file bukti transfer maksimal 5MB');
    }
    if (!/(jpg|jpeg|png|webp|pdf)$/i.test(proofFile.originalname) && !/(jpg|jpeg|png|webp|pdf)$/i.test(proofFile.mimetype)) {
      throw new BadRequestException('Format file bukti transfer tidak valid (harus jpg/jpeg/png/webp/pdf)');
    }

    dto.proofUrl = await this.storageService.uploadFile(proofFile, 'monthly-report-proofs');

    return this.service.uploadProof(id, dto);
  }

  @Get()
  async getReports(
    @Request() req: RequestWithUser,
  ): Promise<MonthlyReportResponseDto[]> {
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
