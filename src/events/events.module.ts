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
import { BullModule } from '@nestjs/bull';
import { BatchRefundProcessor } from './processors/batch-refund.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventEntity,
      EventSessionEntity,
      OrganizerEntity,
      TicketTypeEntity,
      EventCancelRequestEntity,
    ]),
    BullModule.registerQueue({ name: 'batch-refund' }),
    CloudinaryModule,
    MailModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, BatchRefundProcessor],
  exports: [EventsService],
})
export class EventsModule {}
