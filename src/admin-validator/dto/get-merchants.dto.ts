import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum MerchantStatusFilter {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  ALL = 'ALL',
}

export class GetMerchantsFilterDto {
  @IsOptional()
  @IsEnum(MerchantStatusFilter, {
    message:
      'Status must be one of: PENDING_VERIFICATION, ACTIVE, REJECTED, ALL',
  })
  status?: MerchantStatusFilter = MerchantStatusFilter.ALL;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 10;
}
