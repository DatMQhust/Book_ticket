import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatMapEntity } from './entities/seat-map.entity';
import { SeatMapController } from './seat-map.controller';
import { SeatMapService } from './seat-map.service';
import { EventEntity } from '../events/entities/event.entity';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { TicketTypeEntity } from '../ticket-type/entities/ticket-type.entity';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SeatMapEntity,
      EventEntity,
      OrganizerEntity,
      TicketTypeEntity,
      EventSessionEntity,
    ]),
    CloudinaryModule,
  ],
  controllers: [SeatMapController],
  providers: [SeatMapService],
  exports: [SeatMapService],
})
export class SeatMapModule {}
