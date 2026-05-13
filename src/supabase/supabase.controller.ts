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
    @Body('folder') folder: string,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak boleh kosong!');
    }
    
    // Default folder jika tidak dikirim dari client
    const targetFolder = folder || 'images';
    
    const url = await this.supabaseService.uploadImage(file, targetFolder);
    
    return {
      success: true,
      url: url,
    };
  }
}
