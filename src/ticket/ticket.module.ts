import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketEntity } from './entities/ticket.entity';
import { TicketCheckInGuard } from '../auth/guards/ticket-check-in.guard';
import { CollaboratorEntity } from '../collaborators/entities/collaborator.entity';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketEntity, CollaboratorEntity]),
    BookingsModule,
  ],
  controllers: [TicketController],
  providers: [TicketService, TicketCheckInGuard],
})
export class TicketModule {}
