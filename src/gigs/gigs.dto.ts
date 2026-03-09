import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateGigDto {
  @IsNumber()
  @IsNotEmpty()
  merchantId: number;

  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  price: number;

  @IsString()
  @IsOptional()
  mediaUrls?: string; // Menyimpan link foto/video portofolio (bisa bentuk JSON string kalau lebih dari satu)
}

export class PromoteGigDto {
  @IsNumber()
  @IsNotEmpty({ message: 'ID Jasa (gigId) tidak boleh kosong.' })
  gigId: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Durasi promosi (durationDays) harus diisi.' })
  durationDays: number;

  @IsNotEmpty({ message: 'Metode pembayaran harus dipilih.' })
  @IsEnum(['WALLET', 'BANK_TRANSFER'], {
    message: 'Metode pembayaran tidak valid. Pilih WALLET atau BANK_TRANSFER.',
  })
  paymentMethod: 'WALLET' | 'BANK_TRANSFER';
}
