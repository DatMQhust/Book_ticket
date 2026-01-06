import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { OrganizerEntity } from './entities/organizer.entity';
import { EventEntity } from '../events/entities/event.entity';
import { UpdateEventDto } from '../events/dto/update-event.dto';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';
import { TicketTypeEntity } from '../ticket-type/entities/ticket-type.entity';

@Injectable()
export class OrganizersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrganizerEntity)
    private readonly organizersRepository: Repository<OrganizerEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(EventSessionEntity)
    private readonly eventSessionRepository: Repository<EventSessionEntity>,
    @InjectRepository(TicketTypeEntity)
    private readonly ticketTypeRepository: Repository<TicketTypeEntity>,
  ) {}

  async createAndAssignRole(
    createOrganizerDto: CreateOrganizerDto,
  ): Promise<OrganizerEntity> {
    const { userId, name, description } = createOrganizerDto;

    // Sử dụng queryRunner để quản lý transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(UserEntity, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User với ID "${userId}" không tồn tại.`);
      }

      if (user.role === UserRole.ORGANIZER) {
        throw new BadRequestException('User này đã là một organizer.');
      }
      const newOrganizer = this.organizersRepository.create({
        user: user,
        name: name,
        description: description,
      });
      const savedOrganizer = await queryRunner.manager.save(newOrganizer);

      user.role = UserRole.ORGANIZER;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      return savedOrganizer;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<OrganizerEntity[]> {
    return this.organizersRepository.find();
  }

  async findOne(id: string): Promise<OrganizerEntity> {
    const organizer = await this.organizersRepository.findOne({
      where: { id },
    });
    if (!organizer) {
      throw new NotFoundException(`Organizer with ID "${id}" not found.`);
    }
    return organizer;
  }

  async update(
    id: string,
    updateOrganizerDto: Partial<CreateOrganizerDto>,
  ): Promise<OrganizerEntity> {
    const organizer = await this.findOne(id);
    if (updateOrganizerDto.name) {
      organizer.name = updateOrganizerDto.name;
    }
    if (updateOrganizerDto.description) {
      organizer.description = updateOrganizerDto.description;
    }
    return this.organizersRepository.save(organizer);
  }

  async remove(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const organizer = await queryRunner.manager.findOne(OrganizerEntity, {
        where: { id },
        relations: ['user'],
      });

      if (!organizer) {
        throw new NotFoundException(`Organizer with ID "${id}" not found.`);
      }

      const user = organizer.user;
      if (user) {
        user.role = UserRole.USER;
        await queryRunner.manager.save(user);
      }

      await queryRunner.manager.remove(organizer);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getEventsByOrganizer(organizerId: string): Promise<EventEntity[]> {
    return this.eventRepository.find({
      where: { organizer: { id: organizerId } },
      relations: ['ticketTypes', 'sessions', 'sessions.ticketTypes'],
      order: { createdAt: 'DESC' },
    });
  }

  async getEventDetail(
    organizerId: string,
    eventId: string,
  ): Promise<EventEntity> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: [
        'sessions',
        'ticketTypes',
        'sessions.ticketTypes',
        'organizer',
      ],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found.`);
    }

    if (event.organizer.id !== organizerId) {
      throw new ForbiddenException(
        'You do not have permission to access this event.',
      );
    }

    return event;
  }

  async updateEvent(
    organizerId: string,
    eventId: string,
    updateEventDto: UpdateEventDto,
  ): Promise<EventEntity> {
    const event = await this.getEventDetail(organizerId, eventId);
    let totalSold = 0;
    if (event.ticketTypes) {
      totalSold += event.ticketTypes.reduce((sum, tt) => sum + tt.sold, 0);
    }
    if (event.sessions) {
      totalSold += event.sessions.reduce((sSum, session) => {
        if (session.ticketTypes) {
          return (
            sSum + session.ticketTypes.reduce((tSum, tt) => tSum + tt.sold, 0)
          );
        }
        return sSum;
      }, 0);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sessions, ...eventInfo } = updateEventDto;

    if (totalSold > 0) {
      const criticalFields = [
        'location',
        'province',
        'ward',
        'eventType',
        'startSellDate',
      ];
      const hasCriticalUpdates = criticalFields.some(
        (field) =>
          eventInfo[field] !== undefined && eventInfo[field] !== event[field],
      );

      if (hasCriticalUpdates) {
        throw new BadRequestException(
          'Không thể cập nhật thông tin quan trọng (địa điểm, loại sự kiện, thời gian bắt đầu bán) sau khi đã có vé được bán.',
        );
      }
    }

    this.eventRepository.merge(event, eventInfo);

    return this.eventRepository.save(event);
  }

  async deleteEvent(organizerId: string, eventId: string): Promise<void> {
    const event = await this.getEventDetail(organizerId, eventId);
    await this.eventRepository.remove(event);
  }

  async getOrganizerRevenue(organizerId: string) {
    const events = await this.eventRepository.find({
      where: { organizer: { id: organizerId } },
      relations: ['ticketTypes', 'sessions', 'sessions.ticketTypes'],
    });

    let totalRevenue = 0;
    const eventRevenues = events.map((event) => {
      let eventRev = 0;
      // Revenue from event-level ticket types
      if (event.ticketTypes) {
        eventRev += event.ticketTypes.reduce(
          (sum, tt) => sum + tt.price * tt.sold,
          0,
        );
      }
      // Revenue from session-level ticket types
      if (event.sessions) {
        eventRev += event.sessions.reduce((sSum, session) => {
          if (session.ticketTypes) {
            return (
              sSum +
              session.ticketTypes.reduce(
                (tSum, tt) => tSum + tt.price * tt.sold,
                0,
              )
            );
          }
          return sSum;
        }, 0);
      }
      totalRevenue += eventRev;
      return {
        eventId: event.id,
        eventName: event.name,
        revenue: eventRev,
      };
    });

    return {
      totalRevenue,
      events: eventRevenues,
    };
  }

  async getOrganizerIdByUserId(userId: string): Promise<string> {
    const organizer = await this.organizersRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!organizer) {
      throw new NotFoundException(
        `Organizer with user ID "${userId}" not found.`,
      );
    }
    return organizer.id;
  }
}
