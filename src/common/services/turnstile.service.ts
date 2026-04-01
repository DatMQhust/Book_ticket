import { HttpService } from '@nestjs/axios';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TurnstileService {
  private readonly VERIFY_URL =
    'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  private readonly logger = new Logger(TurnstileService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async verify(token: string, ip?: string): Promise<void> {
    if (!token) {
      throw new ForbiddenException('Thiếu token xác thực. Vui lòng thử lại.');
    }

    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');

    // Bỏ qua verify nếu chưa cấu hình (môi trường dev chưa có key)
    if (!secret) {
      this.logger.warn(
        'TURNSTILE_SECRET_KEY chưa được cấu hình — bỏ qua verify.',
      );
      return;
    }

    const params = new URLSearchParams({
      secret,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    });

    const { data } = await firstValueFrom(
      this.http.post(this.VERIFY_URL, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    if (!data.success) {
      this.logger.warn(
        `Turnstile verify thất bại: ${JSON.stringify(data['error-codes'])}`,
      );
      throw new ForbiddenException('Xác thực thất bại. Vui lòng thử lại.');
    }
  }
}
