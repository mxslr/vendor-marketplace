import { IsOptional, IsUrl } from 'class-validator';

export class PayOrderDto {
  @IsOptional()
  @IsUrl({}, { message: 'proofUrl harus berupa URL yang valid' })
  proofUrl?: string;
}
