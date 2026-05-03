import { IsEmail, IsNotEmpty, MinLength, IsString, IsEnum, IsOptional } from "class-validator";
import { Role } from "@prisma/client";

export class CreateUserDto {

    @IsEmail({}, { message: 'Invalid email format' })
    email!: string;

    @MinLength(8, { message: 'Password minimal 8 karakter' })
    password!: string;

    @IsString()
    @IsNotEmpty()
    fullName!: string;

    @IsOptional()
    @IsEnum(Role, { message: 'Role tidak valid' })
    role?: Role;

}