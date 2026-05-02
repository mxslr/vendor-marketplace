import { IsString, IsOptional, IsUrl, IsNotEmpty, MinLength, IsEmail, IsNumber, IsNumberString, Matches } from 'class-validator';

export class RegisterMerchantUserDto {
  @IsEmail({}, {message: 'Invalid email format'})
  email!: string

  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password!: string

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama toko tidak boleh kosong' })
  shopName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi tidak boleh kosong'})
  description!: string;

  @IsUrl({}, { message: 'Format URL logo tidak valid' })
  @IsNotEmpty()
  logoUrl!: string;

  @IsUrl({}, { message: 'Format URL banner tidak valid' })
  @IsNotEmpty()
  bannerUrl!: string; 

  @IsString()
  @Matches(/^[a-zA-Z ]+$/, { message: 'Nama bank tidak boleh berisi angka atau simbol' })
  @IsNotEmpty({ message: 'Nama bank tidak boleh kosong' })
  bankName!: string;

  @IsNumberString({}, {message: 'Nomor rekening hanya boleh berisi angka'})
  @IsNotEmpty({ message: 'Nomor rekening tidak boleh kosong' })
  accountNumber!: string;

  @IsString()
  @Matches(/^[a-zA-Z ]+$/, { message: 'Nama pemilik rekening tidak boleh berisi angka atau simbol' })
  @IsNotEmpty({ message: 'Nama pemilik rekening tidak boleh kosong' })
  accountHolderName!: string;
}


// Wajib upload dokumen identitas dan portofolio untuk verifikasi KYB
export class SubmitKybDto {
  @IsUrl()
  @IsNotEmpty()
  kybDocumentUrl!: string;

  @IsUrl()
  @IsNotEmpty()
  portfolioUrl!: string;
}

export class UpdateProfileDto {
  @IsString() @IsOptional() shopName?: string;
  @IsString() @IsOptional() description?: string;
  @IsUrl() @IsOptional() logoUrl?: string;
  @IsUrl() @IsOptional() bannerUrl?: string;
  @IsString()
  @IsOptional()
  @MinLength(4, { message: 'PIN penarikan minimal 4 digit.' })
  withdrawalPin?: string;
}
