import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Public } from './decorators/auth.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto, @Res() res: Response) {
    const registerReult = await this.authService.register(body, res);
    return res.status(200).json(registerReult);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req, @Res({ passthrough: true }) res: Response) {
    return await this.authService.login(req.user, res);
  }
}
