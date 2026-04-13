import { IsNumber, IsPositive, IsString, IsOptional } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  bankAccountId!: number;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  pin!: string;
}

export class CompleteWithdrawalDto {
  @IsString()
  @IsOptional()
  proofUrl?: string;
}
