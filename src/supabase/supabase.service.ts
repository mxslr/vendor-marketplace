import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config'; // Pastiin sudah install @nestjs/config

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    // 1. Ambil data dari ConfigService dengan fallback atau validasi
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_KEY');
    const bucket = this.configService.get<string>('SUPABASE_BUCKET_NAME');

    if (!url || !key || !bucket) {
      throw new Error('Supabase config is missing in .env');
    }

    this.supabase = createClient(url, key);
    this.bucketName = bucket;
  }

  onModuleInit() {
    // Opsional: Bisa buat cek koneksi di sini kalau perlu
  }

  async uploadImage(file: Express.Multer.File, folderName: string = 'images') {
    // Buat nama file unik biar gak ketimpa (upsert: false)
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    const filePath = `${folderName}/${fileName}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      // Kasih pesan error yang lebih spesifik
      throw new Error(`Supabase Storage Error: ${error.message}`);
    }

    return {
      path: data.path,
      url: this.getPublicUrl(filePath),
    };
  }

  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}
