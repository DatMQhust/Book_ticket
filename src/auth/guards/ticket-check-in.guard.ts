import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketEntity } from '../../ticket/entities/ticket.entity';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class TicketCheckInGuard implements CanActivate {
  constructor(
    @InjectRepository(TicketEntity)
    private ticketRepository: Repository<TicketEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const { accessCode } = request.body;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (!accessCode) {
      throw new ForbiddenException('Access code is required');
    }

    const ticket = await this.ticketRepository.findOne({
      where: { accessCode },
      relations: [
        'ticketType',
        'ticketType.event',
        'ticketType.event.organizer',
        'ticketType.event.organizer.user',
        'ticketType.session',
        'ticketType.session.event',
        'ticketType.session.event.organizer',
        'ticketType.session.event.organizer.user',
      ],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    let organizerUserId: string | undefined;

    if (ticket.ticketType.event) {
      organizerUserId = ticket.ticketType.event.organizer?.user?.id;
    } else if (ticket.ticketType.session?.event) {
      organizerUserId = ticket.ticketType.session.event.organizer?.user?.id;
    }

    if (!organizerUserId) {
      throw new NotFoundException('Organizer not found for this ticket');
    }

    if (user.role === UserRole.ORGANIZER && organizerUserId === user.id) {
      return true;
    }

    throw new ForbiddenException(
      'Only event organizer or admin can check-in tickets',
    );
  }
}
