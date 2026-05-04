import { ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './auth.dto';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string
  };
}


@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(loginDto: LoginDto): Promise<LoginResponse> {
    try{
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if(user.isSuspended){
      throw new ForbiddenException('Akun anda sedang ditangguhkan. silahkan hubungi admin.')
    }

    const payload = { sub: user.id, email: user.email, fullName: user.fullName, role: user.role };

    const token = await this.jwtService.signAsync(payload)
    return {
      access_token: token,
      token_type: "Bearer",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    };
  }catch (error) {
    if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
  }
  console.error('Login Error:', error);
      throw new InternalServerErrorException('Terjadi kesalahan pada server saat login');
  }
}
}
