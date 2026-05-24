import { GigPlan } from '@prisma/client';
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
  @IsNotEmpty()
  @IsEnum(GigPlan)
  plan!: GigPlan;

  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @IsUrl(undefined, { message: 'Link MediaTidak Valid!' })
  mediaUrls!: string; // Menyimpan link foto/video portofolio (bisa bentuk JSON string kalau lebih dari satu)
}
