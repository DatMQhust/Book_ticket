import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingReleaseConsumer } from './consumers/booking-release.consumer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from 'src/order/entities/order.entity';
import { OrganizationPaymentConfigEntity } from 'src/organizers/entities/payment-config.entity';
import { TicketTypeEntity } from 'src/ticket-type/entities/ticket-type.entity';
import { TicketEntity } from 'src/ticket/entities/ticket.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { PaymentEventsGateway } from './payment-events.gateway';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from 'src/common/common.module';
import { WaitingRoomModule } from 'src/waiting-room/waiting-room.module';

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
    CommonModule,
    WaitingRoomModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingReleaseConsumer, PaymentEventsGateway],
  exports: [BookingsService, PaymentEventsGateway],
})
export class BookingsModule {}
