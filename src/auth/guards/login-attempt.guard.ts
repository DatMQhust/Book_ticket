import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class LoginAttemptGuard implements CanActivate {
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_TTL = 900; // 15 phút
  private readonly WINDOW_TTL = 300; // window đếm 5 phút

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress;
    const email = req.body?.email?.toLowerCase()?.trim();

    if (!email) return true;

    const lockKey = `login_lock:${ip}:${email}`;
    const attemptsKey = `login_attempts:${ip}:${email}`;

    const isLocked = await this.redis.exists(lockKey);
    if (isLocked) {
      const ttl = await this.redis.ttl(lockKey);
      throw new HttpException(
        `Tài khoản tạm thời bị khoá do đăng nhập sai nhiều lần. Thử lại sau ${Math.ceil(ttl / 60)} phút.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Truyền sang request để auth.service xử lý kết quả login
    req._loginAttemptsKey = attemptsKey;
    req._loginLockKey = lockKey;
    req._loginMaxAttempts = this.MAX_ATTEMPTS;
    req._loginLockoutTtl = this.LOCKOUT_TTL;
    req._loginWindowTtl = this.WINDOW_TTL;
    return true;
  }
}
