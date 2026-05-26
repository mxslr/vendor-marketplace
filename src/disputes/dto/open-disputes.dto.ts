import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OpenDisputesDto {
  @IsNotEmpty({ message: 'Order ID tidak boleh kosong' })
  @IsNumber({}, { message: 'Order ID harus berupa angka' })
  @Type(() => Number)
  orderId: number;

  @IsNotEmpty({ message: 'Alasan sengketa tidak boleh kosong' })
  @IsString({ message: 'Alasan sengketa harus berupa string' })
  reason: string;

  @IsOptional()
  file?: any;
}
