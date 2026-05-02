import { IsString, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomOfferDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  clientId: number;

  @IsString()
  @IsNotEmpty({ message: 'channelId tidak boleh kosong' })
  channelId: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  gigId: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsString()
  @IsNotEmpty({ message: 'Judul penawaran tidak boleh kosong' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi penawaran tidak boleh kosong' })
  description: string;

  @IsNumber()
  @Min(1, { message: 'deadlineDays minimal 1 hari' })
  @Type(() => Number)
  deadlineDays: number;
}
