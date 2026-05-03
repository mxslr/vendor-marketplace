import { IsNotEmpty, IsUrl } from 'class-validator';

export class PayOrderDto {
  @IsNotEmpty({ message: 'proofUrl tidak boleh kosong' })
  @IsUrl({}, { message: 'proofUrl harus berupa URL yang valid' })
  proofUrl: string;
}
