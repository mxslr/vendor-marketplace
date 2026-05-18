import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { LoginDto } from './auth.dto';
import { Request as ExpressRequest } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() loginDto: LoginDto, @Req() req: ExpressRequest) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
    const result = await this.authService.signIn(loginDto, ip);
    return {
      status: 'success',
      message: 'login successful',
      data: result,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('admin/login')
  async adminSignIn(@Body() loginDto: LoginDto, @Req() req: ExpressRequest) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
    const result = await this.authService.adminSignIn(loginDto, ip);
    return {
      status: 'success',
      message: 'admin login successful',
      data: result,
    };
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
