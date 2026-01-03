import { HttpException, Injectable, Res } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { UserDto } from 'src/users/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.getUserWithPasswordField(email);
    if (user) {
      const isValidPassword = this.usersService.isValidPassword(
        password,
        user.password,
      );
      if (isValidPassword) {
        return user;
      }
    }
    return null;
  }
  async register(register: RegisterDto, res: Response) {
    const { email, name, phone, password } = register;
    const existedUser = await this.usersService.findUserByEmail(email);
    if (existedUser) {
      throw new HttpException('User already exists', 400);
    }

    const newUser = await this.usersService.create({
      email,
      name,
      phone,
      password,
    });

    const payload = { sub: newUser.id, email: newUser.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(newUser.id, hashedRefreshToken);
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'PRODUCTION';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 phút
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });
    return {
      message: 'Register success',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
      },
    };
  }
  async login(user: UserDto, @Res({ passthrough: true }) res: Response) {
    const { id, name, phone, email, role, isActive } = user;
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'PRODUCTION';
    const payload = {
      sub: 'token login',
      iss: 'from server',
      id,
      name,
      phone,
      email,
      role,
      isActive,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('ACCESS_TOKEN_EXPIRATION_TIME'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'REFRESH_TOKEN_EXPIRATION_TIME',
      ),
    });
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(id, hashedRefreshToken);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return {
      user: { id, name, phone, email, role, isActive },
      access_token: accessToken,
    };
  }

  async logout(user: UserDto, res: Response) {
    await this.usersService.updateRefreshToken(user.id, null);
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'PRODUCTION';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    return { message: 'Logout success' };
  }
}
