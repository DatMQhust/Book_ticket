// bookings.processor.ts
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { OrderEntity, OrderStatus } from '../order/entities/order.entity';

@Processor('booking-queue')
export class BookingProcessor {
  private readonly logger = new Logger(BookingProcessor.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private dataSource: DataSource,
    @InjectQueue('booking-queue') private bookingQueue: Queue,
  ) {}

  @Process({ name: 'release-ticket', concurrency: 10 })
  async handleTicketRelease(job: Job) {
    const { userId, ticketTypeId, quantity } = job.data;
    const processingKey = `booking:processing:${userId}:${ticketTypeId}`;

    const isProcessing = await this.redis.get(processingKey);

    if (isProcessing) {
      const currentRetry = job.data.retryCount || 0;
      if (currentRetry < 5) {
        this.logger.log(`User ${userId} is paying. Re-queueing job...`);
        await this.bookingQueue.add(
          'release-ticket',
          { ...job.data, retryCount: currentRetry + 1 },
          { delay: 60000, removeOnComplete: true },
        );
        return;
      }
    }

    this.logger.debug(
      `Checking DB status for user ${userId}, ticketType ${ticketTypeId}...`,
    );

    const recentOrder = await this.dataSource
      .getRepository(OrderEntity)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('order.createdAt > :time', {
        time: new Date(Date.now() - 30 * 60 * 1000),
      })
      .orderBy('order.createdAt', 'DESC')
      .getOne();

    if (recentOrder && recentOrder.status === OrderStatus.COMPLETED) {
      this.logger.log(
        `User ${userId} has completed Order ${recentOrder.id}. Stock secured.`,
      );
      return;
    }

    if (recentOrder && recentOrder.status === OrderStatus.PENDING) {
      const createdTime = new Date(recentOrder.createdAt).getTime();
      const now = Date.now();

      if (now - createdTime < 15 * 60 * 1000) {
        this.logger.log(
          `Order ${recentOrder.id} is PENDING. Snoozing release job...`,
        );
        await this.bookingQueue.add('release-ticket', job.data, {
          delay: 60 * 1000,
          removeOnComplete: true,
        });
        return;
      }
      this.logger.warn(
        `Order ${recentOrder.id} expired (Pending too long). Cancelling...`,
      );
      await this.dataSource
        .getRepository(OrderEntity)
        .update(recentOrder.id, { status: OrderStatus.CANCELLED });
    }

    const stockKey = `ticket_stock:${ticketTypeId}`;
    await this.redis.incrby(stockKey, quantity);

    this.logger.warn(
      `Released ${quantity} tickets for ticket type ${ticketTypeId} (User ${userId} timed out).`,
    );
  }
}
