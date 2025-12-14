import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketEntity } from './entities/ticket.entity';
import { TicketResponseDto } from './dto/ticket-response.dto';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(TicketEntity)
    private ticketRepository: Repository<TicketEntity>,
  ) {}

  findAll() {
    return `This action returns all ticket`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ticket`;
  }
  remove(id: number) {
    return `This action removes a #${id} ticket`;
  }

  async getUserTickets(userId: string): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketRepository.find({
      where: { user: { id: userId } },
      relations: [
        'ticketType',
        'ticketType.event',
        'ticketType.session',
        'ticketType.session.event',
        'order',
      ],
      order: {
        createdAt: 'DESC',
      },
    });

    if (!tickets || tickets.length === 0) {
      return [];
    }

    const ticketResponses = await Promise.all(
      tickets.map(async (ticket) => {
        const event =
          ticket.ticketType.event || ticket.ticketType.session?.event;

        if (!event) {
          throw new NotFoundException(
            `Event not found for ticket ${ticket.id}`,
          );
        }

        const response: TicketResponseDto = {
          id: ticket.id,
          accessCode: ticket.accessCode,
          status: ticket.status,
          checkedInAt: ticket.checkedInAt,
          createdAt: ticket.createdAt,
          ticketType: {
            id: ticket.ticketType.id,
            name: ticket.ticketType.name,
            price: ticket.ticketType.price,
            description: ticket.ticketType.description,
          },
          event: {
            id: event.id,
            name: event.name,
            startTime: ticket.ticketType.session?.startTime || event.createdAt,
            endTime: ticket.ticketType.session?.endTime || event.createdAt,
            location: event.location,
            thumbnail: event.imageUrl || event.bannerUrl,
          },
          order: {
            id: ticket.order.id,
            totalPrice: ticket.order.totalPrice,
            status: ticket.order.status,
            createdAt: ticket.order.createdAt,
          },
        };

        if (ticket.ticketType.session) {
          response.session = {
            id: ticket.ticketType.session.id,
            name: ticket.ticketType.session.name,
            startTime: ticket.ticketType.session.startTime,
            endTime: ticket.ticketType.session.endTime,
          };
        }

        return response;
      }),
    );

    return ticketResponses;
  }
}
