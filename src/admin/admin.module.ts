import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { EventEntity } from '../events/entities/event.entity';
import { OrderEntity } from '../order/entities/order.entity';
import { OrganizationPaymentConfigEntity } from '../organizers/entities/payment-config.entity';
import { MailModule } from '../mail/mail.module';
import { EventCancelRequestEntity } from '../events/entities/event-cancel-request.entity';
import { EventChangeRequestEntity } from '../events/entities/event-change-request.entity';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';
import { WaitingRoomModule } from '../waiting-room/waiting-room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      OrganizerEntity,
      EventEntity,
      EventSessionEntity,
      OrderEntity,
      OrganizationPaymentConfigEntity,
      EventCancelRequestEntity,
      EventChangeRequestEntity,
    ]),
    MailModule,
    WaitingRoomModule,
    HttpModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
