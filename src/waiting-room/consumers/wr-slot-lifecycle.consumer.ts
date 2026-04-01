import { Injectable, Logger } from '@nestjs/common';
import {
  RabbitSubscribe,
  AmqpConnection,
  Nack,
} from '@golevelup/nestjs-rabbitmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ConsumeMessage } from 'amqplib';
import Redis from 'ioredis';
import { WaitingRoomService } from '../waiting-room.service';

interface SlotLifecycleMessage {
  eventId: string;
  userId: string;
  reason: 'token_expire' | 'reserve_done' | 'payment_done' | 'user_leave';
}

interface TokenExpireMessage {
  eventId: string;
  userId: string;
}

const MAX_RETRIES = 3;

@Injectable()
export class WrSlotLifecycleConsumer {
  private readonly logger = new Logger(WrSlotLifecycleConsumer.name);

  constructor(
    private readonly wrService: WaitingRoomService,
    private readonly amqpConnection: AmqpConnection,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Xử lý các sự kiện giải phóng slot tức thì:
   * - reserve_done: user đã reserve vé thành công
   * - payment_done: user đã thanh toán xong
   * - user_leave: user tự rời hàng chờ
   * - token_expire: slot lifecycle consumer cũng xử lý immediate expire
   *
   * Bind: waiting-room-exchange → wr.slot.* → queue wr.slot-lifecycle
   */
  @RabbitSubscribe({
    exchange: 'waiting-room-exchange',
    routingKey: 'wr.slot.*',
    queue: 'wr.slot-lifecycle',
    queueOptions: {
      deadLetterExchange: 'dlq-exchange',
      deadLetterRoutingKey: 'wr.slot-lifecycle',
      channel: 'wr-slot',
    },
  })
  async handleSlotEvent(
    msg: SlotLifecycleMessage,
    rawMsg: ConsumeMessage,
  ): Promise<Nack | void> {
    const { userId, eventId, reason } = msg;
    this.logger.log(
      `Slot lifecycle [${reason}]: user=${userId}, event=${eventId}`,
    );

    try {
      await this.wrService.freeSlotAndAdvance(userId, eventId);
    } catch (error) {
      return this.handleRetry(
        rawMsg,
        'waiting-room-exchange',
        rawMsg.fields.routingKey,
        msg,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Xử lý token hết hạn sau 5 phút (delayed message từ delayed-exchange).
   * Chỉ free slot nếu user vẫn còn trong active set nhưng token đã hết TTL.
   *
   * Bind: delayed-exchange → wr.slot.token-expire → queue wr.token-expire
   */
  @RabbitSubscribe({
    exchange: 'delayed-exchange',
    routingKey: 'wr.slot.token-expire',
    queue: 'wr.token-expire',
    queueOptions: {
      deadLetterExchange: 'dlq-exchange',
      deadLetterRoutingKey: 'wr.token-expire',
      channel: 'wr-slot',
    },
  })
  async handleTokenExpire(
    msg: TokenExpireMessage,
    rawMsg: ConsumeMessage,
  ): Promise<Nack | void> {
    const { userId, eventId } = msg;

    try {
      // Check user vẫn còn trong active set
      const isActive = await this.redis.sismember(
        `wr:active:${eventId}`,
        userId,
      );
      if (!isActive) {
        // Slot đã được free trước đó (reserve/payment done)
        return;
      }

      // Check token còn tồn tại không (Redis TTL)
      const token = await this.redis.get(`wr:token:${userId}:${eventId}`);
      if (token) {
        // Token vẫn còn hạn — delayed message đến trước TTL (edge case clock drift)
        this.logger.warn(
          `Token expire message received but token still valid: user=${userId}, event=${eventId}`,
        );
        return;
      }

      // Token đã hết TTL nhưng user vẫn trong active set → free slot
      this.logger.log(
        `Token expired: freeing slot for user=${userId}, event=${eventId}`,
      );
      await this.wrService.freeSlotAndAdvance(userId, eventId);
    } catch (error) {
      return this.handleRetry(
        rawMsg,
        'delayed-exchange',
        'wr.slot.token-expire',
        msg,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // ─── Retry helper ──────────────────────────────────────────────────────────

  /**
   * Retry với exponential backoff qua delayed-exchange.
   * Khi vượt MAX_RETRIES → nack(false) để message vào DLQ.
   * delay = min(30s, 1s × 2^attempt) + random jitter (tránh thundering herd)
   */
  private handleRetry(
    rawMsg: ConsumeMessage,
    exchange: string,
    routingKey: string,
    payload: unknown,
    error: Error,
  ): Nack {
    const retryCount =
      (rawMsg.properties.headers?.['x-retry-count'] as number) ?? 0;

    if (retryCount >= MAX_RETRIES) {
      this.logger.error(
        `Max retries (${MAX_RETRIES}) exceeded for ${routingKey}. Sending to DLQ.`,
        error.stack,
      );
      return new Nack(false);
    }

    const baseDelay = Math.min(30_000, 1_000 * Math.pow(2, retryCount));
    const jitter = Math.random() * 1_000;
    const delay = Math.round(baseDelay + jitter);

    this.logger.warn(
      `Retry ${retryCount + 1}/${MAX_RETRIES} for ${routingKey} in ${delay}ms. Error: ${error.message}`,
    );

    this.amqpConnection.publish('delayed-exchange', routingKey, payload, {
      headers: {
        'x-delay': delay,
        'x-retry-count': retryCount + 1,
      },
    });

    return new Nack(false);
  }
}
