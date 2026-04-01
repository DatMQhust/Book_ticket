import { Injectable, Logger } from '@nestjs/common';
import {
  RabbitSubscribe,
  AmqpConnection,
  Nack,
} from '@golevelup/nestjs-rabbitmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ConsumeMessage } from 'amqplib';
import Redis from 'ioredis';
import { WaitingRoomGateway } from '../waiting-room.gateway';

interface DisconnectCleanupMessage {
  eventId: string;
  userId: string;
}

const MAX_RETRIES = 3;

@Injectable()
export class WrDisconnectConsumer {
  private readonly logger = new Logger(WrDisconnectConsumer.name);

  constructor(
    private readonly waitingRoomGateway: WaitingRoomGateway,
    private readonly amqpConnection: AmqpConnection,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Xử lý cleanup sau khi user disconnect khỏi /waiting-room namespace.
   * Message được publish với delay 60s (grace period cho multi-tab reconnect).
   * Chỉ ZREM user khỏi queue nếu sau 60s user vẫn chưa reconnect.
   *
   * Bind: delayed-exchange → wr.disconnect → queue wr.disconnect-cleanup
   */
  @RabbitSubscribe({
    exchange: 'delayed-exchange',
    routingKey: 'wr.disconnect',
    queue: 'wr.disconnect-cleanup',
    queueOptions: {
      deadLetterExchange: 'dlq-exchange',
      deadLetterRoutingKey: 'wr.disconnect-cleanup',
    },
  })
  async handleDisconnect(
    msg: DisconnectCleanupMessage,
    rawMsg: ConsumeMessage,
  ): Promise<Nack | void> {
    const { userId, eventId } = msg;

    try {
      // Check user đã reconnect chưa trong 60s grace period
      if (this.waitingRoomGateway.isUserConnected(userId, eventId)) {
        this.logger.log(
          `Disconnect cleanup: user=${userId} đã reconnect, bỏ qua cleanup`,
        );
        return;
      }

      // User vẫn chưa reconnect → xóa khỏi queue (không xóa active slot)
      // Nếu user đang giữ token (active), token sẽ tự expire qua TTL
      // và WrSlotLifecycleConsumer sẽ free slot khi token expire
      const removed = await this.redis.zrem(`wr:queue:${eventId}`, userId);

      if (removed > 0) {
        this.logger.log(
          `Disconnect cleanup: đã xóa user=${userId} khỏi queue event=${eventId}`,
        );
        // Xóa queue-info vì user đã rời
        await this.redis.del(`wr:queue-info:${userId}:${eventId}`);
      } else {
        this.logger.log(
          `Disconnect cleanup: user=${userId} không còn trong queue event=${eventId} (đã rời hoặc đã nhận turn)`,
        );
      }
    } catch (error) {
      return this.handleRetry(
        rawMsg,
        msg,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // ─── Retry helper ──────────────────────────────────────────────────────────

  private handleRetry(
    rawMsg: ConsumeMessage,
    payload: unknown,
    error: Error,
  ): Nack {
    const retryCount =
      (rawMsg.properties.headers?.['x-retry-count'] as number) ?? 0;

    if (retryCount >= MAX_RETRIES) {
      this.logger.error(
        `Max retries (${MAX_RETRIES}) exceeded for wr.disconnect. Sending to DLQ.`,
        error.stack,
      );
      return new Nack(false);
    }

    const baseDelay = Math.min(30_000, 1_000 * Math.pow(2, retryCount));
    const jitter = Math.random() * 1_000;
    const delay = Math.round(baseDelay + jitter);

    this.logger.warn(
      `Retry ${retryCount + 1}/${MAX_RETRIES} for wr.disconnect in ${delay}ms. Error: ${error.message}`,
    );

    this.amqpConnection.publish('delayed-exchange', 'wr.disconnect', payload, {
      headers: {
        'x-delay': delay,
        'x-retry-count': retryCount + 1,
      },
    });

    return new Nack(false);
  }
}
