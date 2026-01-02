import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { EventSessionEntity } from 'src/event-session/entities/event-session.entity';
import { OrganizerEntity } from 'src/organizers/entities/organizer.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { TicketTypeEntity } from 'src/ticket-type/entities/ticket-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    TypeOrmModule.forFeature([EventSessionEntity]),
    TypeOrmModule.forFeature([OrganizerEntity]),
    TypeOrmModule.forFeature([TicketTypeEntity]),
    CloudinaryModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
