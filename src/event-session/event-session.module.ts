import { Module } from '@nestjs/common';
import { EventSessionService } from './event-session.service';
import { EventSessionController } from './event-session.controller';

@Module({
  controllers: [EventSessionController],
  providers: [EventSessionService],
})
export class EventSessionModule {}
