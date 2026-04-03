import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { v4 as uuidv4 } from 'uuid';
import {
  JOIN_OR_QUEUE_SCRIPT,
  ADVANCE_QUEUE_SCRIPT,
  REMOVE_FROM_QUEUE_SCRIPT,
  KEY_PREFIX,
} from './waiting-room.scripts';
import { WaitingRoomGateway } from './waiting-room.gateway';
import { JoinWaitingRoomDto } from './dto/join-waiting-room.dto';
import { ConfigureWaitingRoomDto } from './dto/configure-waiting-room.dto';

export type JoinResult =
  | { status: 'DISABLED' }
  | { status: 'SOLD_OUT' }
  | { status: 'TOKEN'; token: string; ttl: number }
  | { status: 'QUEUED'; position: number }
  | { status: 'FULL' };

export type StatusResult =
  | { status: 'TOKEN'; token: string; ttl: number }
  | { status: 'QUEUED'; position: number; queueInfo: Record<string, string> }
  | { status: 'NONE' };

export interface RoomStatusResult {
  enabled: boolean;
  maxConcurrent: number;
  maxQueueSize: number;
  activeCount: number;
  queueSize: number;
}

const TOKEN_TTL = 300; // 5 phút
const QUEUE_INFO_TTL = 3600;
const DEFAULT_MAX_QUEUE_SIZE = 5000;

@Injectable()
export class WaitingRoomService {
  private readonly logger = new Logger(WaitingRoomService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly amqpConnection: AmqpConnection,
    private readonly waitingRoomGateway: WaitingRoomGateway,
  ) {}

  /**
   * User vào hàng chờ hoặc nhận token ngay nếu còn slot.
   * Xử lý cả reconnect (user đã trong queue/active).
   */
  async join(
    userId: string,
    eventId: string,
    dto: JoinWaitingRoomDto,
  ): Promise<JoinResult> {
    // 1. Check stock trước để tránh queue vô nghĩa
    const stock = await this.redis.get(`ticket_stock:${dto.ticketTypeId}`);
    if (stock !== null && parseInt(stock) < dto.quantity) {
      return { status: 'SOLD_OUT' };
    }

    // 2. Lưu booking intent (dùng khi advance để biết ticketTypeId + quantity)
    await this.redis.hset(`wr:queue-info:${userId}:${eventId}`, {
      ticketTypeId: dto.ticketTypeId,
      quantity: String(dto.quantity),
    });
    await this.redis.expire(
      `wr:queue-info:${userId}:${eventId}`,
      QUEUE_INFO_TTL,
    );

    // 3. Lấy maxQueueSize từ config (fallback về default)
    const configuredMaxQueue = await this.redis.hget(
      `wr:config:${eventId}`,
      'maxQueueSize',
    );
    const maxQueueSize = configuredMaxQueue
      ? configuredMaxQueue
      : String(DEFAULT_MAX_QUEUE_SIZE);

    // 4. Lua script: atomic check + cấp token hoặc enqueue
    const token = uuidv4();
    const result = await this.redis.eval(
      JOIN_OR_QUEUE_SCRIPT,
      4,
      `wr:config:${eventId}`,
      `wr:active:${eventId}`,
      `wr:queue:${eventId}`,
      `wr:token:${userId}:${eventId}`,
      userId,
      Date.now().toString(),
      token,
      String(TOKEN_TTL),
      maxQueueSize,
    );

    const [code, value, ttl] = result as [number, string, string?];

    switch (code) {
      case 0:
        return { status: 'DISABLED' };

      case 1: {
        // Cấp token — schedule token expire qua RabbitMQ delayed message
        const actualTtl = parseInt(ttl || String(TOKEN_TTL));
        this.publishDelayed(
          'wr.slot.token-expire',
          { userId, eventId },
          actualTtl * 1000,
        );
        return { status: 'TOKEN', token: value, ttl: actualTtl };
      }

      case 2:
        return { status: 'QUEUED', position: parseInt(value) };

      case 3:
        return { status: 'FULL' };

      default:
        throw new InternalServerErrorException('Lỗi hệ thống hàng chờ.');
    }
  }

  /**
   * User tự rời khỏi hàng chờ hoặc trả lại slot.
   * Xử lý cả 2 trường hợp: đang trong queue (QUEUED) hoặc đang giữ token (ACTIVE).
   */
  async leave(userId: string, eventId: string): Promise<void> {
    // Xóa khỏi queue (no-op nếu user không trong queue)
    await this.redis.eval(
      REMOVE_FROM_QUEUE_SCRIPT,
      1,
      `wr:queue:${eventId}`,
      userId,
    );

    // Xóa khỏi active set + token (no-op nếu user không active)
    await this.redis.srem(`wr:active:${eventId}`, userId);
    await this.redis.del(`wr:token:${userId}:${eventId}`);
    await this.redis.del(`wr:queue-info:${userId}:${eventId}`);

    // Advance queue: slot vừa được free (nếu user là active) hoặc queue vừa giảm
    // Truyền '' vì đã SREM ở trên, ADVANCE_QUEUE_SCRIPT bỏ qua bước SREM khi ARGV[1] = ''
    await this.freeSlotAndAdvance('', eventId);
  }

  /**
   * Giải phóng slot và advance queue để cấp turn cho người tiếp theo.
   * Gọi bởi: RabbitMQ consumers (token expire, reserve done, payment done, user leave).
   *
   * @param userId - userId cần SREM khỏi active set, hoặc '' nếu đã free trước đó
   * @param eventId
   */
  async freeSlotAndAdvance(userId: string, eventId: string): Promise<void> {
    const enabled = await this.redis.hget(`wr:config:${eventId}`, 'enabled');
    if (enabled !== '1') return;

    const newToken = uuidv4();
    const result = await this.redis.eval(
      ADVANCE_QUEUE_SCRIPT,
      3,
      `wr:active:${eventId}`,
      `wr:queue:${eventId}`,
      `wr:config:${eventId}`,
      userId,
      newToken,
      String(TOKEN_TTL),
      eventId,
      KEY_PREFIX, // ARGV[5]: prefix cho token key build bên trong Lua
    );

    if (result) {
      const [nextUserId, token] = result as [string, string];

      // Schedule token expire cho người vừa nhận turn
      this.publishDelayed(
        'wr.slot.token-expire',
        { userId: nextUserId, eventId },
        TOKEN_TTL * 1000,
      );

      // Lấy booking intent để gửi kèm theo event "đến lượt"
      const queueInfo = await this.redis.hgetall(
        `wr:queue-info:${nextUserId}:${eventId}`,
      );

      // Emit "đến lượt" qua Socket.IO đến user cụ thể
      this.waitingRoomGateway.emitYourTurn(nextUserId, eventId, {
        token,
        ttl: TOKEN_TTL,
        ticketTypeId: queueInfo?.ticketTypeId,
        quantity: parseInt(queueInfo?.quantity || '1'),
      });

      this.logger.log(
        `Advance queue: user ${nextUserId} got turn for event ${eventId}`,
      );
    }

    // Broadcast cập nhật queue size cho tất cả user đang chờ (Option B — event-level)
    // Client nhận totalInQueue và tự estimate lại position thay vì server emit từng user
    await this.broadcastPositionUpdate(eventId);
  }

  /** Validate WR token khi user gọi /bookings/reserve */
  async validateToken(
    userId: string,
    eventId: string,
    token: string,
  ): Promise<boolean> {
    const stored = await this.redis.get(`wr:token:${userId}:${eventId}`);
    return stored === token;
  }

  /** Trạng thái hiện tại của user trong WR */
  async getStatus(userId: string, eventId: string): Promise<StatusResult> {
    const isActive = await this.redis.sismember(`wr:active:${eventId}`, userId);
    if (isActive) {
      const token = await this.redis.get(`wr:token:${userId}:${eventId}`);
      const ttl = await this.redis.ttl(`wr:token:${userId}:${eventId}`);
      if (token) return { status: 'TOKEN', token, ttl };
    }

    const rank = await this.redis.zrank(`wr:queue:${eventId}`, userId);
    if (rank !== null) {
      const queueInfo = await this.redis.hgetall(
        `wr:queue-info:${userId}:${eventId}`,
      );
      return { status: 'QUEUED', position: rank + 1, queueInfo };
    }

    return { status: 'NONE' };
  }

  /** Cấu hình WR cho event — gọi bởi Admin hoặc Organizer */
  async configureRoom(
    eventId: string,
    dto: ConfigureWaitingRoomDto,
  ): Promise<void> {
    if (dto.enabled) {
      await this.redis.hset(`wr:config:${eventId}`, {
        enabled: '1',
        maxConcurrent: String(dto.maxConcurrent),
        maxQueueSize: String(dto.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE),
      });
    } else {
      await this.redis.hset(`wr:config:${eventId}`, { enabled: '0' });
      await this.drainQueue(eventId);
    }
  }

  /** Thống kê real-time của WR */
  async getRoomStatus(eventId: string): Promise<RoomStatusResult> {
    const [config, activeCount, queueSize] = await Promise.all([
      this.redis.hgetall(`wr:config:${eventId}`),
      this.redis.scard(`wr:active:${eventId}`),
      this.redis.zcard(`wr:queue:${eventId}`),
    ]);

    return {
      enabled: config?.enabled === '1',
      maxConcurrent: parseInt(config?.maxConcurrent || '50'),
      maxQueueSize: parseInt(
        config?.maxQueueSize || String(DEFAULT_MAX_QUEUE_SIZE),
      ),
      activeCount,
      queueSize,
    };
  }

  /**
   * Notify WR slot freed sau khi reserve thành công.
   * Gọi bởi BookingsService sau khi Lua reserve thành công.
   */
  publishSlotFreed(userId: string, eventId: string): void {
    this.amqpConnection.publish(
      'waiting-room-exchange',
      'wr.slot.reserve-done',
      {
        userId,
        eventId,
        reason: 'reserve_done',
      },
    );
  }

  /** Publish message lên booking exchange (public — dùng bởi consumers) */
  publishToBooking(
    routingKey: string,
    data: unknown,
    options?: { delayMs?: number },
  ): void {
    if (options?.delayMs) {
      this.publishDelayed(routingKey, data, options.delayMs);
    } else {
      this.amqpConnection.publish('booking-exchange', routingKey, data);
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private publishDelayed(
    routingKey: string,
    data: unknown,
    delayMs: number,
  ): void {
    this.amqpConnection.publish('delayed-exchange', routingKey, data, {
      headers: { 'x-delay': delayMs },
    });
  }

  private publishToWR(routingKey: string, data: unknown): void {
    this.amqpConnection.publish('waiting-room-exchange', routingKey, data);
  }

  /**
   * Broadcast cập nhật queue cho tất cả user đang chờ.
   *
   * Dùng Option B (Section 12-C): emit event-level `wr:queue-shrunk` kèm totalInQueue
   * thay vì emit position cụ thể từng user (tránh N×5000 emit khi queue lớn).
   * Client nhận event này và tự recalculate estimated wait time.
   * Nếu cần position chính xác, client gọi GET /waiting-room/status/:eventId.
   */
  private async broadcastPositionUpdate(eventId: string): Promise<void> {
    const totalInQueue = await this.redis.zcard(`wr:queue:${eventId}`);
    this.waitingRoomGateway.emitQueueShrunk(eventId, { totalInQueue });
  }

  /** Xóa toàn bộ queue khi WR bị tắt */
  private async drainQueue(eventId: string): Promise<void> {
    await Promise.all([
      this.redis.del(`wr:queue:${eventId}`),
      this.redis.del(`wr:active:${eventId}`),
    ]);
    this.logger.log(`Waiting room drained for event ${eventId}`);
  }
}
