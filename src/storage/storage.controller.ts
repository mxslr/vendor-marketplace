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
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('bucket') bucket: string,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak boleh kosong!');
    }

    const targetBucket = bucket || 'merchant-assets';
    const url = await this.storageService.uploadFile(file, targetBucket);

    return { success: true, url };
  }
}
