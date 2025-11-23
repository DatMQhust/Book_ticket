import { Module } from '@nestjs/common';
import { TicketTypeService } from './ticket-type.service';
import { TicketTypeController } from './ticket-type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketTypeEntity } from './entities/ticket-type.entity';
import { EventEntity } from 'src/events/entities/event.entity';
import { EventSessionEntity } from 'src/event-session/entities/event-session.entity';
import { OrganizerEntity } from 'src/organizers/entities/organizer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketTypeEntity]),
    TypeOrmModule.forFeature([EventEntity]),
    TypeOrmModule.forFeature([EventSessionEntity]),
    TypeOrmModule.forFeature([OrganizerEntity]),
  ],
  controllers: [TicketTypeController],
  providers: [TicketTypeService],
})
export class TicketTypeModule {}
