import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { OrderEntity, OrderStatus } from '../../order/entities/order.entity';
import { WaitingRoomService } from '../../waiting-room/waiting-room.service';

export interface ReleaseTicketMessage {
  userId: string;
  ticketTypeId: string;
  quantity: number;
  eventId?: string;
  reservationKey: string;
  retryCount: number;
}

@Injectable()
export class BookingReleaseConsumer {
  private readonly logger = new Logger(BookingReleaseConsumer.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
    private readonly amqpConnection: AmqpConnection,
    private readonly waitingRoomService: WaitingRoomService,
  ) {}

  @RabbitSubscribe({
    exchange: 'delayed-exchange',
    routingKey: 'booking.release',
    queue: 'booking.release-ticket',
    queueOptions: {
      deadLetterExchange: 'dlq-exchange',
      deadLetterRoutingKey: 'booking.release-ticket',
    },
  })
  async handleReleaseTicket(msg: ReleaseTicketMessage): Promise<void> {
    const {
      userId,
      ticketTypeId,
      quantity,
      eventId,
      reservationKey,
      retryCount,
    } = msg;
    const processingKey = `booking:processing:${userId}:${ticketTypeId}`;

    const isProcessing = await this.redis.get(processingKey);

    if (isProcessing) {
      const currentRetry = retryCount ?? 0;
      if (currentRetry < 5) {
        this.logger.log(`User ${userId} đang thanh toán. Re-queue tin nhắn...`);
        this.amqpConnection.publish(
          'delayed-exchange',
          'booking.release',
          { ...msg, retryCount: currentRetry + 1 },
          { headers: { 'x-delay': 60_000 } },
        );
        return;
      }
    }

    this.logger.debug(
      `Kiểm tra trạng thái DB cho user ${userId}, ticketType ${ticketTypeId}...`,
    );

    const recentOrder = await this.dataSource
      .getRepository(OrderEntity)
      .createQueryBuilder('order')
      .leftJoin('order.user', 'user')
      .select(['order.id', 'order.status', 'order.createdAt'])
      .where('user.id = :userId', { userId })
      .andWhere('order.createdAt > :time', {
        time: new Date(Date.now() - 30 * 60 * 1000),
      })
      .orderBy('order.createdAt', 'DESC')
      .getOne();

    if (recentOrder && recentOrder.status === OrderStatus.COMPLETED) {
      this.logger.log(
        `User ${userId} đã hoàn tất Order ${recentOrder.id}. Giữ nguyên stock.`,
      );
      return;
    }

    if (recentOrder && recentOrder.status === OrderStatus.PENDING) {
      const createdTime = new Date(recentOrder.createdAt).getTime();
      const now = Date.now();

      if (now - createdTime < 15 * 60 * 1000) {
        this.logger.log(
          `Order ${recentOrder.id} đang PENDING. Hoãn release job...`,
        );
        this.amqpConnection.publish(
          'delayed-exchange',
          'booking.release',
          msg,
          { headers: { 'x-delay': 60_000 } },
        );
        return;
      }
      this.logger.warn(
        `Order ${recentOrder.id} quá hạn (PENDING quá lâu). Huỷ đơn...`,
      );
      await this.dataSource
        .getRepository(OrderEntity)
        .update(recentOrder.id, { status: OrderStatus.CANCELLED });
    }

    const stockKey = `ticket_stock:${ticketTypeId}`;
    await this.redis.incrby(stockKey, quantity);

    this.logger.warn(
      `Đã trả lại ${quantity} vé loại ${ticketTypeId} (User ${userId} hết thời gian giữ chỗ).`,
    );

    // Free WR slot sau khi release stock (nếu event có WR bật)
    if (eventId) {
      const wrEnabled = await this.redis.hget(
        `wr:config:${eventId}`,
        'enabled',
      );
      if (wrEnabled === '1') {
        await this.waitingRoomService.freeSlotAndAdvance(userId, eventId);
      }
    }
  }
}
