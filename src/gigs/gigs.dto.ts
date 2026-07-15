import { GigPlan, GigStatus } from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUrl,
  ValidateIf,
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

  @ValidateIf((o) => o.mediaUrls !== undefined && o.mediaUrls !== '')
  @IsUrl(undefined, { message: 'Link Media Tidak Valid!' })
  @IsOptional()
  mediaUrls?: string;

  @IsString()
  @IsOptional()
  @IsEnum(GigStatus)
  status?: GigStatus;
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
