import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';
import { AssociatePermission } from '@prisma/client';

export class AddAssociateDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email!: string;

  @IsEnum(AssociatePermission, { message: 'Permission tidak valid' })
  @IsNotEmpty({ message: 'Permission tidak boleh kosong' })
  permission!: AssociatePermission;
}
