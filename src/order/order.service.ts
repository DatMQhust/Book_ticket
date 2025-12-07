import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {}
  async getOrderById(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['tickets', 'user'],
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return {
      id: order.id,
      status: order.status,
      totalPrice: order.totalPrice,
      transactionId: order.transactionId,
      paymentMethod: order.paymentMethod,
      tickets: order.tickets.map((ticket) => ({
        id: ticket.id,
        accessCode: ticket.accessCode,
        status: ticket.status,
      })),
    };
  }
}
