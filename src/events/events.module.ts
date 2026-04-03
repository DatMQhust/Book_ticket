import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { EventSessionEntity } from 'src/event-session/entities/event-session.entity';
import { OrganizerEntity } from 'src/organizers/entities/organizer.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { TicketTypeEntity } from 'src/ticket-type/entities/ticket-type.entity';
import { MailModule } from 'src/mail/mail.module';
import { EventCancelRequestEntity } from './entities/event-cancel-request.entity';
import { EventChangeRequestEntity } from './entities/event-change-request.entity';
import { BatchRefundConsumer } from './consumers/batch-refund.consumer';
import { TicketEntity } from 'src/ticket/entities/ticket.entity';
import { WaitingRoomModule } from 'src/waiting-room/waiting-room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventEntity,
      EventSessionEntity,
      OrganizerEntity,
      TicketTypeEntity,
      EventCancelRequestEntity,
      EventChangeRequestEntity,
      TicketEntity,
    ]),
    CloudinaryModule,
    MailModule,
    WaitingRoomModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, BatchRefundConsumer],
  exports: [EventsService],
})
export class EventsModule {}
