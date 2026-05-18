import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key =
      this.configService.get<string>('SUPABASE_SERVICE_KEY') ??
      this.configService.get<string>('SUPABASE_KEY') ??
      this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!url || !key) {
      throw new Error('SUPABASE_URL and one of SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY are required in .env');
    }

    this.supabase = createClient(url, key);
  }

  async uploadFile(file: Express.Multer.File, bucket: string): Promise<string> {
    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `File upload failed: ${error.message}`,
      );
    }

    return this.getPublicUrl(bucket, filename);
  }

  getPublicUrl(bucket: string, filename: string): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(filename);
    return data.publicUrl;
  }
}
