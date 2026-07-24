import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DeliverablesService } from './deliverables.service';
import { AuthGuard } from '../auth/auth.guard';
import { SubmitDeliverableDto } from './dto/submit-deliverable.dto';
import { StorageService } from '../storage/storage.service';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    role: string;
  };
}

@Controller('deliverables')
export class DeliverablesController {
  constructor(
    private deliverablesService: DeliverablesService,
    private storageService: StorageService,
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 150 * 1024 * 1024 },
    }),
  )
  async submit(
    @Request() req: RequestWithUser,
    @Body() body: SubmitDeliverableDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let finalFileUrl = body.fileUrl;

    if (file) {
      const maxSize = 150 * 1024 * 1024; // 150MB
      if (file.size > maxSize) {
        throw new BadRequestException('Ukuran file deliverable maksimal 150MB');
      }
      finalFileUrl = await this.storageService.uploadFile(file, 'deliverables');
    }

    if (!finalFileUrl) {
      throw new BadRequestException('File deliverable tidak boleh kosong!');
    }

    return this.deliverablesService.submitDeliverable(
      req.user.sub,
      body.orderId,
      finalFileUrl,
      body.message,
    );
  }
}
