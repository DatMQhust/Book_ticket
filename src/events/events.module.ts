import { Module } from '@nestjs/common';
import { EventService } from './events.service';
import { EventController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { EventSessionEntity } from 'src/event-session/entities/event-session.entity';
import { OrganizerEntity } from 'src/organizers/entities/organizer.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    TypeOrmModule.forFeature([EventSessionEntity]),
    TypeOrmModule.forFeature([OrganizerEntity]),
    CloudinaryModule,
  ],
  controllers: [EventController],
  providers: [EventService],
})
export class EventsModule {}
