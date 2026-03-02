import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';

export class CreateMerchantDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama toko tidak boleh kosong' })
  shopName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl({}, { message: 'Format URL logo tidak valid' })
  @IsOptional()
  logoUrl?: string;

  @IsUrl({}, { message: 'Format URL banner tidak valid' })
  @IsOptional()
  bannerUrl?: string;

  // Detail Bank wajib diisi saat Onboarding
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountHolderName: string;
}

// Wajib upload dokumen identitas dan portofolio untuk verifikasi KYB
export class SubmitKybDto {
  @IsUrl()
  @IsNotEmpty()
  kybDocumentUrl: string;

  @IsUrl()
  @IsNotEmpty()
  portfolioUrl: string;
}

// kebutuhan untuk update profil toko
export class UpdateProfileDto {
  @IsString() @IsOptional() shopName?: string;
  @IsString() @IsOptional() description?: string;
  @IsUrl() @IsOptional() logoUrl?: string;
  @IsUrl() @IsOptional() bannerUrl?: string;
}

// Kebutuhan untuk admin menolak toko dengan alasan tertentu
export class RejectMerchantDto {
  @IsString()
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  reason: string;
}

export class ApproveMerchantDto {
  @IsBoolean()
  @IsNotEmpty()
  status: boolean;
}
