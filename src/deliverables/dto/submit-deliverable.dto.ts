import { IsNotEmpty, IsNumber, IsString, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitDeliverableDto {
  @IsNumber()
  @Type(() => Number)
  orderId: number;

  @IsNotEmpty({ message: 'fileUrl tidak boleh kosong' })
  @IsUrl({}, { message: 'fileUrl harus berupa URL yang valid' })
  fileUrl: string;

  @IsString()
  @IsNotEmpty({ message: 'message tidak boleh kosong' })
  message: string;
}
