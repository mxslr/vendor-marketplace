import {
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsUrl,
  IsNotEmpty,
} from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Akun bank tidak boleh kosong!' })
  bankAccountId!: number;

  @IsNumber()
  @IsPositive({ message: 'Jumlah harus lebih besar dari 0!' })
  @IsNotEmpty({ message: 'Jumlah tidak boleh kosong!' })
  amount!: number;

  @IsString()
  @IsNotEmpty({ message: 'PIN tidak boleh kosong!' })
  pin!: string;
}

export class CompleteWithdrawalDto {
  @IsNotEmpty({ message: 'Bukti tidak boleh kosong!' })
  @IsUrl({}, { message: 'Bukti harus berupa URL!' })
  proofUrl!: string;
}
