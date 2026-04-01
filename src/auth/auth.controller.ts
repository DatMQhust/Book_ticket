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
import { Response, Request } from 'express';
import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TurnstileService } from 'src/common/services/turnstile.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly turnstileService: TurnstileService,
  ) {}

  @Public()
  @Throttle({ strict: { limit: 3, ttl: 3_600_000 } }) // 3 lần/giờ/IP
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.socket?.remoteAddress;
    await this.turnstileService.verify(body.turnstileToken, ip);
    const registerReult = await this.authService.register(body, res);
    return res.status(200).json(registerReult);
  }

  @Public()
  @UseGuards(LoginAttemptGuard, LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
    @Body('turnstileToken') turnstileToken: string,
  ) {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.socket?.remoteAddress;
    await this.turnstileService.verify(turnstileToken, ip);
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
