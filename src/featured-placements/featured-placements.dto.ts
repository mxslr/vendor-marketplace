import {
  IsInt,
  Min,
  IsString,
  IsNotEmpty,
  IsUrl,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreatePromoteDto {
  @IsInt()
  @Min(1)
  gigId!: number;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsBoolean()
  @IsOptional()
  payWithWallet?: boolean;
}

export class UploadProofDto {
  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  proofUrl?: string;
}
