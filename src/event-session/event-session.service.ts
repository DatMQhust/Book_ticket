import { Injectable } from '@nestjs/common';
import { CreateEventSessionDto } from './dto/create-event-session.dto';
import { UpdateEventSessionDto } from './dto/update-event-session.dto';

@Injectable()
export class EventSessionService {
  create(createEventSessionDto: CreateEventSessionDto) {
    return 'This action adds a new eventSession';
  }

  findAll() {
    return `This action returns all eventSession`;
  }

  findOne(id: number) {
    return `This action returns a #${id} eventSession`;
  }

  update(id: number, updateEventSessionDto: UpdateEventSessionDto) {
    return `This action updates a #${id} eventSession`;
  }

  remove(id: number) {
    return `This action removes a #${id} eventSession`;
  }
}
