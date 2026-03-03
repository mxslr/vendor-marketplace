import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Endpoint: POST /users
  @Post()
  async createUser(@Body() userData: Prisma.UserCreateInput) {
    return this.usersService.createUser(userData);
  }

  // Endpoint: GET /users
  @Get()
  async findAll() {
    return this.usersService.findAllUsers();
  }
}
