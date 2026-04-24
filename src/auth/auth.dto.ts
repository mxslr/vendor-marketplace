import { IsEmail, IsNotEmpty, IsOptional } from "class-validator";


export class LoginDto {

    @IsEmail({}, {message: 'Invalid email format'})
    @IsNotEmpty()
    email!: string;

    @IsNotEmpty({message: 'Password is required'})
    password!: string;

    @IsOptional()
    role?: string
}

