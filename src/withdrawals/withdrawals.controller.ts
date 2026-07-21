import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Request,
  UseGuards,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WithdrawalsService } from './withdrawals.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateWithdrawalDto, CompleteWithdrawalDto } from './withdrawals.dto';
import { StorageService } from '../storage/storage.service';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('withdrawals')
@UseGuards(AuthGuard)
export class WithdrawalsController {
  constructor(
    private readonly withdrawalsService: WithdrawalsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  async requestWithdrawal(
    @Request() req: RequestWithUser,
    @Body() body: CreateWithdrawalDto,
  ) {
    return this.withdrawalsService.requestWithdrawal(
      Number(req.user.sub),
      body,
    );
  }

  @Get()
  async findMyWithdrawals(@Request() req: RequestWithUser) {
    return this.withdrawalsService.findMyWithdrawals(Number(req.user.sub));
  }

  @Get('pending')
  async findPendingWithdrawals(@Request() req: RequestWithUser) {
    return this.withdrawalsService.findPendingWithdrawals(Number(req.user.sub));
  }

  @Get(':id')
  async findWithdrawalById(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.withdrawalsService.findWithdrawalById(Number(req.user.sub), id);
  }

  @Patch(':id/complete')
  @UseInterceptors(FileInterceptor('proof'))
  async completeWithdrawal(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CompleteWithdrawalDto,
    @UploadedFile() proofFile?: Express.Multer.File,
  ) {
    if (!proofFile) {
      throw new BadRequestException('File bukti transfer (proof) tidak boleh kosong!');
    }
    if (proofFile.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Ukuran file bukti transfer maksimal 5MB');
    }
    if (!/(jpg|jpeg|png|webp|pdf)$/i.test(proofFile.originalname) && !/(jpg|jpeg|png|webp|pdf)$/i.test(proofFile.mimetype)) {
      throw new BadRequestException('Format file bukti transfer tidak valid (harus jpg/jpeg/png/webp/pdf)');
    }

    body.proofUrl = await this.storageService.uploadFile(proofFile, 'withdrawal-proofs');

    return this.withdrawalsService.completeWithdrawal(
      Number(req.user.sub),
      id,
      body,
    );
  }

  @Patch(':id/reject')
  async rejectWithdrawal(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.withdrawalsService.rejectWithdrawal(Number(req.user.sub), id);
  }
}
