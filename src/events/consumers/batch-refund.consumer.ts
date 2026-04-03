import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { DataSource, In } from 'typeorm';
import { OrderEntity, OrderStatus } from '../../order/entities/order.entity';
import {
  TicketEntity,
  TicketStatus,
} from '../../ticket/entities/ticket.entity';
import { EventEntity, EventStatus } from '../entities/event.entity';
import { MailService } from '../../mail/mail.service';

// Mỗi message xử lý tối đa ORDER_CHUNK_SIZE đơn hàng
const ORDER_CHUNK_SIZE = 100;

// Gửi email theo lô nhỏ — tránh Gmail throttle
const EMAIL_BATCH_SIZE = 20;
const EMAIL_BATCH_DELAY_MS = 3000; // 3s giữa mỗi lô email

export interface BatchRefundMessage {
  eventId: string;
  offset: number; // vị trí bắt đầu của chunk hiện tại
  eventName: string; // cache để không query lại mỗi chunk
  eventDate: string;
}

@Injectable()
export class BatchRefundConsumer {
  private readonly logger = new Logger(BatchRefundConsumer.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  @RabbitSubscribe({
    exchange: 'booking-exchange',
    routingKey: 'booking.refund',
    queue: 'booking.batch-refund',
    queueOptions: {
      deadLetterExchange: 'dlq-exchange',
      deadLetterRoutingKey: 'booking.batch-refund',
    },
  })
  async handleBatchRefund(msg: BatchRefundMessage): Promise<void> {
    const { eventId, offset, eventName, eventDate } = msg;

    this.logger.log(
      `Processing batch refund chunk — event: ${eventId}, offset: ${offset}`,
    );

    // Lấy một chunk ORDER_CHUNK_SIZE orders tại vị trí offset
    const orders = await this.dataSource
      .getRepository(OrderEntity)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.tickets', 'ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('ticketType.event', 'directEvent')
      .leftJoinAndSelect('ticketType.session', 'session')
      .leftJoinAndSelect('session.event', 'sessionEvent')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('(directEvent.id = :eventId OR sessionEvent.id = :eventId)', {
        eventId,
      })
      .skip(offset)
      .take(ORDER_CHUNK_SIZE)
      .getMany();

    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);

      // Batch update: Orders → REFUNDED
      await this.dataSource
        .getRepository(OrderEntity)
        .update({ id: In(orderIds) }, { status: OrderStatus.REFUNDED });

      // Batch update: Tickets UNCHECKED → CANCELLED
      const ticketIds = orders.flatMap(
        (o) => o.tickets?.map((t) => t.id) ?? [],
      );
      if (ticketIds.length > 0) {
        await this.dataSource
          .getRepository(TicketEntity)
          .update(
            { id: In(ticketIds), status: TicketStatus.UNCHECKED },
            { status: TicketStatus.CANCELLED },
          );
      }

      // Gửi email theo lô nhỏ — tránh throttle
      await this.sendEmailsInBatches(orders, eventName, eventDate);
    }

    const isLastChunk = orders.length < ORDER_CHUNK_SIZE;

    if (isLastChunk) {
      // Tất cả chunks đã xử lý xong — đánh dấu Event CANCELLED
      await this.dataSource
        .getRepository(EventEntity)
        .update(eventId, { status: EventStatus.CANCELLED });

      this.logger.log(
        `Batch refund completed for event ${eventId}. Total processed up to offset ${offset + orders.length}.`,
      );
    } else {
      // Còn orders — publish chunk tiếp theo
      this.amqpConnection.publish('booking-exchange', 'booking.refund', {
        eventId,
        offset: offset + ORDER_CHUNK_SIZE,
        eventName,
        eventDate,
      });

      this.logger.log(
        `Chunk done — published next chunk at offset ${offset + ORDER_CHUNK_SIZE}`,
      );
    }
  }

  private async sendEmailsInBatches(
    orders: OrderEntity[],
    eventName: string,
    eventDate: string,
  ): Promise<void> {
    for (let i = 0; i < orders.length; i += EMAIL_BATCH_SIZE) {
      const batch = orders.slice(i, i + EMAIL_BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (order) => {
          if (!order.user?.email) return;

          try {
            await this.mailService.sendEventCancelled({
              to: order.user.email,
              userName: order.user.name,
              eventName,
              eventDate,
            });
            await this.mailService.sendRefundConfirmed({
              to: order.user.email,
              userName: order.user.name,
              eventName,
              amount: order.totalPrice,
            });
          } catch (err) {
            this.logger.error(
              `Email failed for ${order.user.email}: ${err.message}`,
            );
          }
        }),
      );

      // Delay giữa các lô để tránh Gmail throttle (bỏ qua lô cuối)
      if (i + EMAIL_BATCH_SIZE < orders.length) {
        await new Promise((res) => setTimeout(res, EMAIL_BATCH_DELAY_MS));
      }
    }
  }
}
