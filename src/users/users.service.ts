import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: CreateUserDto): Promise<Omit<User, 'passwordHash' | 'isSuspended'>> {
    const { email, fullName, password } = data;
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({ where: { email : normalizedEmail}})
    if(existingUser){
      throw new BadRequestException('Email sudah terdaftar')
    }
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: hashedPassword,
          fullName: fullName,
          ...(data.role && { role: data.role }),
        },
      });

      const { passwordHash, isSuspended, ...result } = newUser;
      return result;

    } catch (error) {
      console.error('Detail Error Server:', error); 

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Terjadi kesalahan pada input database');
      }

      // Fallback: Jika error tidak dikenal, kirim status 500
      throw new InternalServerErrorException('Maaf, terjadi masalah internal pada server kami');
    }
  }


  async findAllUsers(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}
