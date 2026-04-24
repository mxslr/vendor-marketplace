import { Exclude } from "class-transformer";
import { IsEmail, IsNotEmpty, MinLength, IsString } from "class-validator";


export class CreateUserDto {

    @IsEmail({}, {message: 'Invalid email format'})
    email!: string

    @MinLength(8, { message: 'Password minimal 8 karakter' })
    password!: string

    @IsString()
    @IsNotEmpty()
    fullName!: string;

}