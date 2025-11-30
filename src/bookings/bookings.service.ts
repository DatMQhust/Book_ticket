import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { TicketTypeEntity } from '../ticket-type/entities/ticket-type.entity';
import { TicketEntity, TicketStatus } from '../ticket/entities/ticket.entity';
import { OrderEntity, OrderStatus } from '../order/entities/order.entity';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class BookingsService implements OnModuleInit {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const ticketTypes = await this.dataSource
      .getRepository(TicketTypeEntity)
      .find();
    for (const type of ticketTypes) {
      const key = `ticket_stock:${type.id}`;
      const exists = await this.redis.exists(key);
      if (!exists) {
        // Available = Total - Sold
        const available = type.quantity - type.sold;
        await this.redis.set(key, available);
      }
    }
    console.log('✅ Redis Stock Synced (Prefix: highshow:)');
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

    // B. Lua Script: Kiểm tra và Trừ kho trong 1 bước (Atomic)
    const luaScript = `
      local stock = tonumber(redis.call('get', KEYS[1]))
      if stock >= tonumber(ARGV[1]) then
        redis.call('decrby', KEYS[1], ARGV[1])
        return 1
      else
        return 0
      end
    `;

    const result = await this.redis.eval(luaScript, 1, stockKey, quantity);

    if (result === 0) {
      throw new BadRequestException('Vé đã hết hoặc không đủ số lượng.');
    }

    // C. Lưu thông tin giữ chỗ (TTL 10 phút)
    const reservationData = {
      ticketTypeId,
      userId,
      quantity,
      timestamp: Date.now(),
    };

    await this.redis.set(
      reservationKey,
      JSON.stringify(reservationData),
      'EX',
      600,
    );

    return {
      success: true,
      message: 'Giữ chỗ thành công',
      reservationId: reservationKey,
      expiresIn: 600,
    };
  }

  async confirmBooking(userId: string, ticketTypeId: string) {
    const reservationKey = `reservation:${userId}:${ticketTypeId}`;
    const stockKey = `ticket_stock:${ticketTypeId}`;

    // A. Lấy data từ Redis
    const rawData = await this.redis.get(reservationKey);
    if (!rawData) {
      throw new BadRequestException('Giao dịch hết hạn hoặc không tồn tại.');
    }
    const reservation = JSON.parse(rawData);

    // B. Bắt đầu Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ticketType = await queryRunner.manager.findOne(TicketTypeEntity, {
        where: { id: ticketTypeId },
      });
      if (!ticketType) throw new NotFoundException('Loại vé không hợp lệ.');

      // C. Tạo Order
      const order = queryRunner.manager.create(OrderEntity, {
        user: { id: userId } as UserEntity,
        totalPrice: ticketType.price * reservation.quantity,
        totalQuantity: reservation.quantity,
        status: OrderStatus.COMPLETED,
        paymentMethod: 'TEST_PAYMENT', // Sau này lấy từ body request
        transactionId: `TX-${Date.now()}`,
      });
      const savedOrder = await queryRunner.manager.save(order);

      // D. Tạo Tickets (kèm Access Code)
      const tickets = [];
      const ticketsForUser = [];
      for (let i = 0; i < reservation.quantity; i++) {
        // Sinh mã ngẫu nhiên: 6 ký tự chữ số in hoa (VD: 8XK9LP)
        const randomCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();

        ticketsForUser.push({ accessCode: randomCode, seat: ticketType.name });

        tickets.push(
          queryRunner.manager.create(TicketEntity, {
            ticketType: ticketType,
            order: savedOrder,
            user: { id: userId } as UserEntity,
            status: TicketStatus.UNCHECKED,
            accessCode: `${randomCode}-${i}`,
          }),
        );
      }
      await queryRunner.manager.save(tickets);

      // E. Update số đã bán trong DB
      await queryRunner.manager.increment(
        TicketTypeEntity,
        { id: ticketTypeId },
        'sold',
        reservation.quantity,
      );

      // F. Commit Transaction
      await queryRunner.commitTransaction();

      // G. Xóa giữ chỗ trong Redis
      await this.redis.del(reservationKey);
      console.log("Successful booking for user:", userId);
      return {
        success: true,
        orderId: savedOrder.id,
        message: 'Thanh toán thành công. Vé đã được gửi.',
        tickets: ticketsForUser,
      };
    } catch (err) {
      // H. Rollback & Hoàn vé về kho Redis nếu lỗi DB
      await queryRunner.rollbackTransaction();
      await this.redis.incrby(stockKey, reservation.quantity);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
