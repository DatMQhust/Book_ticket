import { Injectable } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TicketEntity, TicketStatus } from './entities/ticket.entity';
import { OrganizerEntity } from 'src/organizers/entities/organizer.entity';

@Injectable()
export class TicketService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TicketEntity)
    private readonly ticketRepository: Repository<TicketEntity>,
    @InjectRepository(OrganizerEntity)
    private readonly organizerRepository: Repository<OrganizerEntity>,
  ) {}

  async checkIn(createTicketDto: CreateTicketDto) {
    const { accessCode, organizerId } = createTicketDto;

    const ticket = await this.ticketRepository.findOne({
      where: { accessCode },
      relations: [
        'ticketType',
        'ticketType.session',
        'ticketType.session.event.organizer',
        'user',
      ],
    });
    if (!ticket) {
      return { valid: false, message: 'Vé không tồn tại trong hệ thống!' };
    }
    const organizer = await this.organizerRepository.findOne({
      where: { id: organizerId },
    });
    if (!organizer) {
      return { valid: false, message: 'Nhà tổ chức không tồn tại!' };
    }
    if (ticket.ticketType.session.event.organizer.id !== organizerId) {
      return {
        valid: false,
        message: `Vé sự kiện này không thuộc về nhà tổ chức ${organizer.name} !`,
      };
    }
    if (ticket.status === TicketStatus.CHECKED_IN) {
      return { valid: false, message: 'Vé đã được check-in trước đó!' };
    }
    ticket.status = TicketStatus.CHECKED_IN;
    await this.ticketRepository.save(ticket);
    return { valid: true, message: 'Check-in thành công!' };
  }
}
