import { IsInt, Min, IsString, IsNotEmpty, IsUrl, IsBoolean, IsOptional } from 'class-validator';

export class CreatePromoteDto {
  @IsInt()
  @Min(1)
  gigId!: number;

  @IsBoolean()
  @IsOptional()
  payWithWallet?: boolean;
}

export class UploadProofDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  proofUrl!: string;
}