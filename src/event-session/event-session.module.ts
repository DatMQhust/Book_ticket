import { Module } from '@nestjs/common';
import { EventSessionService } from './event-session.service';
import { EventSessionController } from './event-session.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventSessionEntity } from './entities/event-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventSessionEntity])],
  controllers: [EventSessionController],
  providers: [EventSessionService],
})
export class EventSessionModule {}
