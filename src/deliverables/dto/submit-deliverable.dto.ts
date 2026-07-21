import { IsNotEmpty, IsNumber, IsString, IsUrl, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitDeliverableDto {
  @IsNumber()
  @Type(() => Number)
  orderId: number;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'fileUrl harus berupa URL yang valid' })
  fileUrl?: string;

  @IsString()
  @IsNotEmpty({ message: 'message tidak boleh kosong' })
  message: string;
}
