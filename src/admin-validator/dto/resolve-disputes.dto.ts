import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DisputeDecision } from '../enum/dispute.enum';

export class ResolveDisputeDto {
  @IsNotEmpty({ message: 'Keputusan tidak boleh kosong' })
  @IsEnum(DisputeDecision, { message: 'Keputusan tidak valid' })
  decision: DisputeDecision;
}
