import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DisputeDecision } from '../enum/dispute.enum';

export class SubmitDisputeDto {
  @IsNotEmpty({ message: 'Keputusan tidak boleh kosong' })
  @IsEnum(DisputeDecision, { message: 'Keputusan tidak valid' })
  decision!: DisputeDecision;

  @IsOptional()
  @IsString({ message: 'Catatan harus berupa string' })
  notes?: string;
}
