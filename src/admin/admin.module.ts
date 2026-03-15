import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { EventEntity } from '../events/entities/event.entity';
import { OrderEntity } from '../order/entities/order.entity';
import { OrganizationPaymentConfigEntity } from '../organizers/entities/payment-config.entity';
import { MailModule } from '../mail/mail.module';
import { EventCancelRequestEntity } from '../events/entities/event-cancel-request.entity';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';

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
    ]),
    BullModule.registerQueue({ name: 'batch-refund' }),
    MailModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
