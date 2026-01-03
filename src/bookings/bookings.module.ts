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
import { PaymentEventsGateway } from './payment-events.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketTypeEntity,
      OrderEntity,
      TicketEntity,
      UserEntity,
      OrganizationPaymentConfigEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '7d' },
    }),
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
  providers: [BookingsService, BookingProcessor, PaymentEventsGateway],
  exports: [BookingsService, PaymentEventsGateway],
})
export class BookingsModule {}
