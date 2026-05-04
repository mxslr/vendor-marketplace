import { IsString, IsNumber, IsOptional, IsNotEmpty, IsUrl, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateReportDto {
  @IsString()  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be in format YYYY-MM' })  period!: string; // Format: "YYYY-MM"
}

export class UpdateOperationalCostDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operationalCost!: number;
}

export class ProcessDividendDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  cscPercentage?: number = 60;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  cciPercentage?: number = 40;
}

export class UploadProofDto {
  @IsNotEmpty({ message: 'proofUrl tidak boleh kosong' })
  @IsUrl({}, { message: 'proofUrl harus berupa URL yang valid' })
  proofUrl!: string;
}

export class MonthlyReportResponseDto {
  id!: number;
  period!: string;
  totalGmv!: number;
  grossRevenue!: number;
  operationalCost!: number;
  netProfit!: number;
  cscShare!: number;
  cciShare!: number;
  status!: string;
  proofOfTransfer?: string;
  createdAt!: Date;
  lockedAt?: Date;
}