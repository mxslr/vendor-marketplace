import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

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
      const command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      return this.getPublicUrl(targetBucket, filename);
    } catch (error) {
      throw new InternalServerErrorException(
        `File upload to MinIO/S3 failed: ${error.message || error}`,
      );
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
