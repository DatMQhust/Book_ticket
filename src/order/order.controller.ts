import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.orderService.getOrderById(id);
  }

  @Get(':id/status')
  async getOrderStatus(@Param('id') id: string) {
    const order = await this.orderService.getOrderById(id);
    return {
      orderId: order.id,
      status: order.status,
      updatedAt: order.updatedAt,
    };
  }
}
