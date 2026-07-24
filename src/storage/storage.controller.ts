import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('upload')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 150 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('bucket') bucket: string,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak boleh kosong!');
    }

    const targetBucket = bucket || 'merchant-assets';

    // Only 'deliverables' bucket gets 150MB limit; all registration & profile assets (logo, banner, KYB, avatar) stay strictly 5MB!
    const isDeliverable = targetBucket === 'deliverables';
    const maxAllowedSize = isDeliverable ? 150 * 1024 * 1024 : 5 * 1024 * 1024;

    if (file.size > maxAllowedSize) {
      const limitMb = isDeliverable ? 150 : 5;
      throw new BadRequestException(`Ukuran file maksimal ${limitMb}MB`);
    }

    const url = await this.storageService.uploadFile(file, targetBucket);

    return { success: true, url };
  }
}
