import { IsInt, Min, IsString, IsNotEmpty, IsUrl} from 'class-validator';

export class CreatePromoteDto {
  @IsInt()
  @Min(1)
  gigId: number;
}

export class UploadProofDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  proofUrl: string;
}