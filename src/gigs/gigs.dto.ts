import { GigPlan, GigStatus } from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUrl,
} from 'class-validator';

export class CreateGigDto {
  @IsNumber()
  @IsNotEmpty()
  categoryId!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  @IsEnum(GigPlan)
  plan?: GigPlan;

  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @IsUrl(undefined, { message: 'Link MediaTidak Valid!' })
  mediaUrls!: string; // Menyimpan link foto/video portofolio (bisa bentuk JSON string kalau lebih dari satu)
}

export class UpdateGigDto {
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsEnum(GigPlan)
  plan?: GigPlan;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  mediaUrls?: string;

  @IsString()
  @IsOptional()
  @IsEnum(GigStatus)
  status?: GigStatus;
}
