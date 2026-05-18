import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseService } from './supabase.service';

@Controller('upload')
export class SupabaseController {
  constructor(private readonly supabaseService: SupabaseService) {}

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
    const url = await this.supabaseService.uploadFile(file, targetBucket);

    return { success: true, url };
  }
}
