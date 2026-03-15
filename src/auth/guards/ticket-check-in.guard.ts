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
import { CollaboratorEntity } from '../../collaborators/entities/collaborator.entity';

@Injectable()
export class TicketCheckInGuard implements CanActivate {
  constructor(
    @InjectRepository(TicketEntity)
    private ticketRepository: Repository<TicketEntity>,
    @InjectRepository(CollaboratorEntity)
    private collaboratorRepository: Repository<CollaboratorEntity>,
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

    // Xác định eventId từ vé
    let eventId: string | undefined;
    let organizerUserId: string | undefined;

    if (ticket.ticketType.event) {
      eventId = ticket.ticketType.event.id;
      organizerUserId = ticket.ticketType.event.organizer?.user?.id;
    } else if (ticket.ticketType.session?.event) {
      eventId = ticket.ticketType.session.event.id;
      organizerUserId = ticket.ticketType.session.event.organizer?.user?.id;
    }

    if (!organizerUserId || !eventId) {
      throw new NotFoundException('Organizer not found for this ticket');
    }

    // ORGANIZER: chỉ được check-in sự kiện của mình
    if (user.role === UserRole.ORGANIZER && organizerUserId === user.id) {
      return true;
    }

    // COLLABORATOR: chỉ được check-in sự kiện được giao
    if (user.role === UserRole.COLLABORATOR) {
      const collaborator = await this.collaboratorRepository.findOne({
        where: { user: { id: user.id }, isActive: true },
      });

      if (!collaborator) {
        throw new ForbiddenException('Tài khoản CTV không còn hoạt động.');
      }

      if (!collaborator.assignedEventIds.includes(eventId)) {
        throw new ForbiddenException(
          'CTV không có quyền check-in sự kiện này.',
        );
      }

      return true;
    }

    throw new ForbiddenException(
      'Only event organizer or admin can check-in tickets',
    );
  }
}
