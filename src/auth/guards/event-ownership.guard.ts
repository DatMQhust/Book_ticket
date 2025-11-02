import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
  Inject, // Thêm Inject
} from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { EventsService } from 'src/events/events.service';

@Injectable()
export class EventOwnershipGuard implements CanActivate {
  constructor(
    private readonly eventService: EventsService,
    @Inject(REQUEST) private request: Request,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = this.request.user as any;

    const eventId = this.request.params.id;

    if (!user || !eventId) {
      return false;
    }
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    const event = await this.eventService.getEventWithOwner(eventId);

    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }
    const ownerId = event.organizer?.user?.id;

    if (!ownerId) {
      throw new ForbiddenException('Resource owner not found.');
    }

    if (ownerId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to modify this resource.',
      );
    }

    return true;
  }
}
