import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomOfferDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  clientId: number;

  @IsNotEmpty({ message: 'channelId tidak boleh kosong' })
  @IsString()
  channelId: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  gigId: number;

  @IsNumber()
  @Min(0, { message: 'Price tidak dapat minus' })
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
