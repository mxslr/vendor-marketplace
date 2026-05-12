import { IsNotEmpty, IsNumber, IsString, IsUrl } from 'class-validator';

export class OpenDisputesDto {
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsNotEmpty()
  @IsUrl()
  evidenceUrls: string;
}
