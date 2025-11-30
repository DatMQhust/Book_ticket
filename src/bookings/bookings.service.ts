import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { TicketTypeEntity } from '../ticket-type/entities/ticket-type.entity';
import { TicketEntity, TicketStatus } from '../ticket/entities/ticket.entity';
import { OrderEntity, OrderStatus } from '../order/entities/order.entity';
import { OrganizationPaymentConfigEntity } from '../organizers/entities/payment-config.entity';
import { UserEntity } from '../users/entities/user.entity';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import PayOS from '@payos/node';

@Injectable()
export class BookingsService implements OnModuleInit {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private dataSource: DataSource,
    @InjectQueue('booking-queue') private bookingQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.syncStockToRedis();
  }

  async syncStockToRedis() {
    const ticketTypes = await this.dataSource
      .getRepository(TicketTypeEntity)
      .find();

    for (const type of ticketTypes) {
      const key = `ticket_stock:${type.id}`;
      const available = type.quantity - type.sold;
      const setResource = await this.redis.setnx(key, available);
      if (setResource === 1) {
        this.logger.log(
          `Initialized stock for TicketType ${type.id}: ${available}`,
        );
      }
    }
  }

  async reserveTicket(userId: string, ticketTypeId: string, quantity: number) {
    const stockKey = `ticket_stock:${ticketTypeId}`;
    const reservationKey = `reservation:${userId}:${ticketTypeId}`;

    const existing = await this.redis.get(reservationKey);
    if (existing) {
      throw new BadRequestException(
        'Bạn đang có vé đang giữ. Vui lòng thanh toán.',
      );
    }

    const luaScript = `
      local stock = tonumber(redis.call('get', KEYS[1]))
      if not stock then return -1 end
      if stock >= tonumber(ARGV[1]) then
        redis.call('decrby', KEYS[1], ARGV[1])
        return 1
      else
        return 0
      end
    `;

    const result = await this.redis.eval(luaScript, 1, stockKey, quantity);

    if (result === -1) {
      await this.syncStockToRedis();
      throw new BadRequestException('Hệ thống đang đồng bộ, vui lòng thử lại.');
    }
    if (result === 0) {
      throw new BadRequestException('Vé đã hết hoặc không đủ số lượng.');
    }

    const reservationData = {
      ticketTypeId,
      userId,
      quantity,
      timestamp: Date.now(),
    };

    const ttl = 600;
    await this.redis.set(
      reservationKey,
      JSON.stringify(reservationData),
      'EX',
      ttl,
    );

    await this.bookingQueue.add(
      'release-ticket',
      {
        userId,
        ticketTypeId,
        quantity,
        reservationKey,
      },
      {
        delay: ttl * 1000,
        removeOnComplete: true,
      },
    );

    return {
      success: true,
      message: 'Giữ chỗ thành công',
      reservationId: reservationKey,
      expiresIn: ttl,
    };
  }

  private async getPayOSInstance(ticketTypeId: string): Promise<any> {
    const ticketType = await this.dataSource
      .getRepository(TicketTypeEntity)
      .findOne({
        where: { id: ticketTypeId },
        relations: ['session', 'session.event', 'session.event.organizer'],
      });

    if (!ticketType) throw new NotFoundException('Ticket Type not found');

    const organization = ticketType.session?.event?.organizer;

    if (!organization) {
      throw new BadRequestException('Vé này không thuộc về BTC hợp lệ');
    }

    const paymentConfig = await this.dataSource
      .getRepository(OrganizationPaymentConfigEntity)
      .findOne({
        where: { organizerId: organization.id },
      });

    if (!paymentConfig) {
      throw new BadRequestException(
        'BTC chưa cấu hình thanh toán. Không thể mua vé.',
      );
    }

    return new PayOS(
      paymentConfig.payosClientId,
      paymentConfig.payosApiKey,
      paymentConfig.payosChecksumKey,
    );
  }

  async initiatePayment(userId: string, ticketTypeId: string) {
    const reservationKey = `reservation:${userId}:${ticketTypeId}`;
    const processingKey = `booking:processing:${userId}:${ticketTypeId}`;

    const rawData = await this.redis.get(reservationKey);
    if (!rawData) throw new BadRequestException('Giao dịch hết hạn.');
    const reservation = JSON.parse(rawData);

    await this.redis.set(processingKey, 'true', 'EX', 300);

    const payOS = await this.getPayOSInstance(ticketTypeId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ticketType = await queryRunner.manager.findOne(TicketTypeEntity, {
        where: { id: ticketTypeId },
      });

      const orderCode = Number(
        String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000),
      );
      const totalPrice = ticketType.price * reservation.quantity;

      const order = queryRunner.manager.create(OrderEntity, {
        user: { id: userId } as UserEntity,
        totalPrice: totalPrice,
        totalQuantity: reservation.quantity,
        status: OrderStatus.PENDING,
        paymentMethod: 'PAYOS',
        transactionId: orderCode.toString(),
      });

      const savedOrder = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      await this.redis.set(
        `order_context_code:${orderCode}`,
        ticketTypeId,
        'EX',
        600,
      );

      const paymentLinkData = await payOS.createPaymentLink({
        orderCode: orderCode,
        amount: totalPrice,
        description: `Mua ve ${ticketType.name.substring(0, 20)}`,
        items: [
          {
            name: ticketType.name,
            quantity: reservation.quantity,
            price: ticketType.price,
          },
        ],
        cancelUrl: 'http://localhost:3000/cancel',
        returnUrl: 'http://localhost:3000/success',
      });

      return {
        success: true,
        orderId: savedOrder.id,
        paymentUrl: paymentLinkData.checkoutUrl,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      await this.redis.del(processingKey);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async finalizePaymentWebhook(webhookData: any) {
    const { orderCode, code } = webhookData.data;

    const order = await this.dataSource.getRepository(OrderEntity).findOne({
      where: { transactionId: orderCode.toString() },
      relations: ['user'],
    });

    if (!order) return { success: false };
    if (order.status === OrderStatus.COMPLETED) return { success: true };

    const ticketTypeId = await this.redis.get(
      `order_context_code:${orderCode}`,
    );
    if (!ticketTypeId) return { success: false };

    const payOS = await this.getPayOSInstance(ticketTypeId);

    try {
      payOS.verifyPaymentWebhookData(webhookData);
    } catch (e) {
      this.logger.error('Webhook Fake Detected!');
      return { success: false };
    }

    if (code !== '00') return { success: false };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = OrderStatus.COMPLETED;
      await queryRunner.manager.save(order);

      const ticketType = await queryRunner.manager.findOne(TicketTypeEntity, {
        where: { id: ticketTypeId },
      });

      const tickets = [];
      for (let i = 0; i < order.totalQuantity; i++) {
        const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        tickets.push(
          queryRunner.manager.create(TicketEntity, {
            ticketType: ticketType,
            order: order,
            user: order.user,
            status: TicketStatus.UNCHECKED,
            accessCode: `${orderCode}-${suffix}-${i}`,
          }),
        );
      }
      await queryRunner.manager.save(tickets);

      await queryRunner.manager.increment(
        TicketTypeEntity,
        { id: ticketTypeId },
        'sold',
        order.totalQuantity,
      );

      await queryRunner.commitTransaction();

      const reservationKey = `reservation:${order.user.id}:${ticketTypeId}`;
      const processingKey = `booking:processing:${order.user.id}:${ticketTypeId}`;
      await this.redis.del(reservationKey);
      await this.redis.del(processingKey);
      await this.redis.del(`order_context_code:${orderCode}`);

      this.logger.log(`Order ${orderCode} COMPLETED.`);
      return { success: true };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Webhook Error', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
