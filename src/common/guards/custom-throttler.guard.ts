import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.id;
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    return userId ? `user_${userId}` : `ip_${ip}`;
  }

  protected throwThrottlingException(): never {
    throw new HttpException(
      'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
