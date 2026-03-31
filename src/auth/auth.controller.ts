import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Public } from './decorators/auth.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginAttemptGuard } from './guards/login-attempt.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ strict: { limit: 3, ttl: 3_600_000 } }) // 3 lần/giờ/IP
  @Post('register')
  async register(@Body() body: RegisterDto, @Res() res: Response) {
    const registerReult = await this.authService.register(body, res);
    return res.status(200).json(registerReult);
  }

  @Public()
  @UseGuards(LoginAttemptGuard, LocalAuthGuard)
  @Throttle({ strict: { limit: 5, ttl: 300_000 } }) // 5 lần/5 phút/IP
  @Post('login')
  async login(@Req() req, @Res({ passthrough: true }) res: Response) {
    return await this.authService.login(req.user, res);
  }

  @Post('logout')
  async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
    return await this.authService.logout(req.user, res);
  }

  @Get('me')
  async getMe(@Req() req) {
    return {
      user: req.user,
    };
  }

  @Public()
  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req, @Res() res: Response) {
    const user = req.user;
    if (user) {
      const tokens = await this.authService.login(user, res);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      return res.redirect(
        `${frontendUrl}/auth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`,
      );
    }
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return res.redirect(`${frontendUrl}/login?error=unauthorized`);
  }
}
