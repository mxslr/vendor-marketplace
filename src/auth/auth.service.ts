import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './auth.dto';
import { Role } from '@prisma/client';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
}

const MAX_ATTEMPTS = 3;
const BLOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private async checkIpBlock(ip: string): Promise<void> {
    const record = await (this.prisma as any).loginAttempt.findUnique({
      where: { ip },
    });
    if (record?.blockedUntil && record.blockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (record.blockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new HttpException(
        `IP diblokir karena terlalu banyak percobaan login gagal. Coba lagi dalam ${minutesLeft} menit.`,
        429,
      );
    }
  }

  private async recordFailedAttempt(ip: string): Promise<void> {
    const record = await (this.prisma as any).loginAttempt.upsert({
      where: { ip },
      update: { attempts: { increment: 1 }, lastAttempt: new Date() },
      create: { ip, attempts: 1, lastAttempt: new Date() },
    });

    if (record.attempts >= MAX_ATTEMPTS) {
      const blockedUntil = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000);
      await (this.prisma as any).loginAttempt.update({
        where: { ip },
        data: { blockedUntil },
      });
    }
  }

  private async resetAttempts(ip: string): Promise<void> {
    await (this.prisma as any).loginAttempt.upsert({
      where: { ip },
      update: { attempts: 0, blockedUntil: null, lastAttempt: new Date() },
      create: { ip, attempts: 0, lastAttempt: new Date() },
    });
  }

  async adminSignIn(loginDto: LoginDto, ip: string): Promise<LoginResponse> {
    try {
      await this.checkIpBlock(ip);

      const user = await this.usersService.findByEmail(loginDto.email);
      const isMatch = user
        ? await bcrypt.compare(loginDto.password, user.passwordHash)
        : false;

      if (!user || !isMatch) {
        await this.recordFailedAttempt(ip);
        throw new UnauthorizedException('Email atau password salah');
      }

      if (
        user.role !== Role.SUPER_ADMIN &&
        user.role !== Role.ADMIN_VALIDATOR &&
        user.role !== Role.ADMIN_FINANCE
      ) {
        await this.recordFailedAttempt(ip);
        throw new ForbiddenException(
          'Akses ditolak. Endpoint ini hanya untuk Admin.',
        );
      }

      await this.resetAttempts(ip);

      const payload = {
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };
      const token = await this.jwtService.signAsync(payload);
      return {
        access_token: token,
        token_type: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof HttpException
      ) {
        throw error;
      }
      console.error('Admin Login Error:', error);
      throw new InternalServerErrorException(
        'Terjadi kesalahan pada server saat login',
      );
    }
  }

  async signIn(loginDto: LoginDto, ip: string): Promise<LoginResponse> {
    try {
      await this.checkIpBlock(ip);

      const user = await this.usersService.findByEmail(loginDto.email);
      const isMatch = user
        ? await bcrypt.compare(loginDto.password, user.passwordHash)
        : false;

      if (!user || !isMatch) {
        await this.recordFailedAttempt(ip);
        throw new UnauthorizedException('Email atau password salah');
      }

      if (
        user.role === Role.SUPER_ADMIN ||
        user.role === Role.ADMIN_VALIDATOR ||
        user.role === Role.ADMIN_FINANCE
      ) {
        throw new ForbiddenException(
          'Akses ditolak. Akun admin tidak dapat login melalui portal pengguna umum.',
        );
      }

      // CFG-02: block non-SUPER_ADMIN logins during maintenance mode
      const maintenanceConfig = await this.prisma.systemConfig.findUnique({
        where: { key: 'maintenance_mode' },
      });
      if (
        maintenanceConfig?.value === 'true' &&
        (user.role as any) !== Role.SUPER_ADMIN
      ) {
        throw new ServiceUnavailableException(
          'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
        );
      }

      if (user.isSuspended) {
        throw new ForbiddenException(
          'Akun anda sedang ditangguhkan. silahkan hubungi admin.',
        );
      }

      await this.resetAttempts(ip);

      const payload = {
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };
      const token = await this.jwtService.signAsync(payload);
      return {
        access_token: token,
        token_type: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof ServiceUnavailableException ||
        error instanceof HttpException
      ) {
        throw error;
      }
      console.error('Login Error:', error);
      throw new InternalServerErrorException(
        'Terjadi kesalahan pada server saat login',
      );
    }
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isSuspended: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }
    return {
      sub: user.id,
      ...user,
    };
  }
}
