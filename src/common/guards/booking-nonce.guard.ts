import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class BookingNonceGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const nonce = req.headers['x-booking-nonce'] as string;
    const userId = req.user?.id;

    if (!nonce) {
      throw new ForbiddenException(
        'Phiên đặt vé không hợp lệ. Vui lòng tải lại trang.',
      );
    }

    const stored = await this.redis.get(`booking_nonce:${nonce}`);
    if (!stored) {
      throw new ForbiddenException(
        'Phiên đặt vé đã hết hạn. Vui lòng tải lại trang.',
      );
    }

    const [storedUserId] = stored.split(':');
    if (storedUserId !== userId) {
      throw new ForbiddenException('Phiên đặt vé không hợp lệ.');
    }

    await this.redis.del(`booking_nonce:${nonce}`); // dùng xong là xoá (one-time)
    return true;
  }
}
