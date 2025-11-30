import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BullModule } from '@nestjs/bull';
import { BookingProcessor } from './booking.processor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from 'src/order/entities/order.entity';
import { OrganizationPaymentConfigEntity } from 'src/organizers/entities/payment-config.entity';
import { TicketTypeEntity } from 'src/ticket-type/entities/ticket-type.entity';
import { TicketEntity } from 'src/ticket/entities/ticket.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketTypeEntity,
      OrderEntity,
      TicketEntity,
      UserEntity,
      OrganizationPaymentConfigEntity,
    ]),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'booking-queue',
    }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingProcessor],
  exports: [BookingsService],
})
export class BookingsModule {}
