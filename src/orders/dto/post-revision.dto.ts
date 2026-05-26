import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PostRevisionDto {
  @IsString({
    message: 'Catatan revisi harus berupa string',
  })
  @IsNotEmpty({
    message: 'Catatan revisi tidak boleh kosong',
  })
  @MaxLength(1000, {
    message: 'Catatan revisi tidak boleh lebih dari 1000 karakter',
  })
  revisionNote: string;
}
