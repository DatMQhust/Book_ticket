import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketTypeEntity } from './entities/ticket-type.entity';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto'; // Tận dụng DTO cũ
import { Roles } from 'src/auth/decorators/auth.decorator';
import { UserRole } from 'src/users/entities/user.entity';
// Import Auth Guard, User decorator...

@Controller('ticket-types')
export class TicketTypeController {
  constructor(
    @InjectRepository(TicketTypeEntity)
    private ticketTypeRepo: Repository<TicketTypeEntity>,
    @InjectRepository(EventSessionEntity)
    private sessionRepo: Repository<EventSessionEntity>,
  ) {}

  @Post('add-to-session')
  @Roles(UserRole.ORGANIZER)
  async addTicketToSession(
    @Body() body: { sessionId: string; ticketData: CreateTicketTypeDto },
  ) {
    const { sessionId, ticketData } = body;

    // 1. Kiểm tra session có tồn tại không
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['event', 'event.organizer'],
    });

    if (!session) {
      throw new BadRequestException('Phiên diễn không tồn tại');
    }
    const newTicket = this.ticketTypeRepo.create({
      ...ticketData,
      session: session,
    });

    return this.ticketTypeRepo.save(newTicket);
  }
}
