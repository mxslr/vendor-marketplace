import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private defaultBucket: string;
  private endpoint: string;
  private forcePathStyle: boolean;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY');
    this.defaultBucket = this.configService.get<string>('S3_BUCKET_NAME') || 'merchant-assets';
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    this.forcePathStyle = this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY are required in .env for storage',
      );
    }

    this.endpoint = endpoint;

    this.s3Client = new S3Client({
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
      forcePathStyle: this.forcePathStyle,
    });
  }

  async uploadFile(file: Express.Multer.File, bucket?: string): Promise<string> {
    const targetBucket = bucket || this.defaultBucket;
    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;

    try {
      // Pastikan bucket sudah ada, jika belum ada maka buat bucket baru secara otomatis
      try {
        await this.s3Client.send(new HeadBucketCommand({ Bucket: targetBucket }));
      } catch (headError) {
        console.log(`Bucket '${targetBucket}' tidak ditemukan. Mencoba membuat bucket baru...`);
        await this.s3Client.send(new CreateBucketCommand({ Bucket: targetBucket }));
        console.log(`Bucket '${targetBucket}' berhasil dibuat secara otomatis.`);
      }

      const command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      return this.getPublicUrl(targetBucket, filename);
    } catch (error) {
      console.warn('MinIO/S3 connection failed. Falling back to local disk storage:', error.message || error);
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, file.buffer);
        
        const port = process.env.PORT || 4000;
        return `http://localhost:${port}/uploads/${filename}`;
      } catch (localError) {
        throw new InternalServerErrorException(
          `File upload failed: S3 failed (${error.message}) and local storage failed (${localError.message})`,
        );
      }
    }
  }

  getPublicUrl(bucket: string, filename: string): string {
    const cleanEndpoint = this.endpoint.replace(/\/$/, '');

    if (this.forcePathStyle) {
      return `${cleanEndpoint}/${bucket}/${filename}`;
    } else {
      const url = new URL(cleanEndpoint);
      return `${url.protocol}//${bucket}.${url.host}/${filename}`;
    }
  }
}
