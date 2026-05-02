import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsUrl } from 'class-validator';

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

  @IsNumber()
  price!: number;

  @IsUrl(undefined, { message: 'Link MediaTidak Valid!' })
  mediaUrls!: string; // Menyimpan link foto/video portofolio (bisa bentuk JSON string kalau lebih dari satu)
}


