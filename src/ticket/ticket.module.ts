import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketEntity } from './entities/ticket.entity';
import { OrganizerEntity } from 'src/organizers/entities/organizer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketEntity]),
    TypeOrmModule.forFeature([OrganizerEntity]),
  ],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
