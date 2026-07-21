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
  @UseInterceptors(FileInterceptor('file'))
  async submit(
    @Request() req: RequestWithUser,
    @Body() body: SubmitDeliverableDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File deliverable tidak boleh kosong!');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Ukuran file deliverable maksimal 5MB');
    }

    body.fileUrl = await this.storageService.uploadFile(file, 'deliverables');

    return this.deliverablesService.submitDeliverable(
      req.user.sub,
      body.orderId,
      body.fileUrl,
      body.message,
    );
  }
}
