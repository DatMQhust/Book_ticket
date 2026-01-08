import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import {
  Repository,
  DataSource,
  ILike,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  In,
} from 'typeorm';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateEventDto } from './dto/create-event.dto';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { TicketTypeEntity } from '../ticket-type/entities/ticket-type.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,

    @InjectRepository(EventSessionEntity)
    private readonly sessionRepository: Repository<EventSessionEntity>,

    @InjectRepository(TicketTypeEntity)
    private readonly ticketTypeRepository: Repository<TicketTypeEntity>,

    private readonly dataSource: DataSource,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createEvent(
    createEventDto: CreateEventDto,
    bannerImage: Express.Multer.File,
    mainImage: Express.Multer.File,
    userId: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [bannerUpload, imageUpload] = await Promise.all([
        this.cloudinaryService.uploadImage(bannerImage, 'events/banners'),
        this.cloudinaryService.uploadImage(mainImage, 'events/images'),
      ]);
      const organizer = await queryRunner.manager.findOne(OrganizerEntity, {
        where: { user: { id: userId } },
      });
      const organizerId = organizer.id;
      const event = this.eventRepository.create({
        ...createEventDto,
        bannerUrl: bannerUpload.secure_url,
        imageUrl: imageUpload.secure_url,
        organizer: { id: organizerId } as OrganizerEntity,
        sessions: [],
      });

      const savedEvent = await queryRunner.manager.save(event);

      if (createEventDto.sessions && createEventDto.sessions.length > 0) {
        for (const sessionDto of createEventDto.sessions) {
          const session = this.sessionRepository.create({
            name: sessionDto.name,
            startTime: sessionDto.startTime,
            endTime: sessionDto.endTime,
            event: savedEvent,
          });

          const savedSession = await queryRunner.manager.save(session);

          if (sessionDto.ticketTypes && sessionDto.ticketTypes.length > 0) {
            const ticketTypes = sessionDto.ticketTypes.map((ticketDto) => {
              return this.ticketTypeRepository.create({
                name: ticketDto.name,
                price: ticketDto.price,
                quantity: ticketDto.quantity,
                description: ticketDto.description || '',
                rank: ticketDto.rank || 1,
                sold: 0,
                session: savedSession,
                event: null,
              });
            });

            await queryRunner.manager.save(ticketTypes);
          }
        }
      }
      await queryRunner.commitTransaction();

      return savedEvent;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      throw new InternalServerErrorException(
        'Failed to create event. Transaction rolled back.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async addTicketTypeToEvent(
    eventId: string,
    ticketData: {
      name: string;
      price: number;
      quantity: number;
      description: string;
      rank?: number;
    },
  ): Promise<TicketTypeEntity> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['sessions'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.sessions && event.sessions.length > 0) {
      throw new InternalServerErrorException(
        'Cannot add ticket type directly to event with sessions. Use add-to-session endpoint instead.',
      );
    }

    const ticketType = this.ticketTypeRepository.create({
      ...ticketData,
      sold: 0,
      rank: ticketData.rank || 1,
      event: event,
      session: null,
    });

    return await this.ticketTypeRepository.save(ticketType);
  }

  async getEvents(query: GetEventsQueryDto) {
    const {
      limit = 12,
      page = 1,
      sortBy = 'createdAt',
      order = 'DESC',
      eventType,
      status,
      province,
      search,
      startDate,
      endDate,
      priceFrom,
      priceTo,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (eventType) {
      where.eventType = eventType;
    }

    if (status) {
      where.status = status;
    }

    if (province) {
      where.province = ILike(`%${province}%`);
    }

    if (search) {
      where.name = ILike(`%${search}%`);
    }

    if (startDate && endDate) {
      where.sessions = {
        startTime: Between(new Date(startDate), new Date(endDate)),
      };
    } else if (startDate) {
      where.sessions = {
        startTime: MoreThanOrEqual(new Date(startDate)),
      };
    } else if (endDate) {
      where.sessions = {
        startTime: LessThanOrEqual(new Date(endDate)),
      };
    }
    if (priceFrom !== undefined || priceTo !== undefined) {
      where.ticketTypes = {};
      if (priceFrom !== undefined) {
        where.ticketTypes.price = MoreThanOrEqual(priceFrom);
      }
      if (priceTo !== undefined) {
        where.ticketTypes.price = LessThanOrEqual(priceTo);
      }
    }

    const [events, total] = await this.eventRepository.findAndCount({
      where,
      order: {
        [sortBy]: order,
      },
      take: limit,
      skip,
      relations: ['organizer', 'sessions'],
    });

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTotalSoldTickets(eventId: string): Promise<number> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['ticketTypes', 'sessions', 'sessions.ticketTypes'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

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

    return totalSold;
  }

  async getMostPopularEvents(limit: number) {
    const events = await this.eventRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['organizer', 'sessions'],
    });

    const mostPopularEvents = await Promise.all(
      events.map(async (event) => {
        const totalSold = await this.getTotalSoldTickets(event.id);
        return { event, totalSold };
      }),
    );
    mostPopularEvents.sort((a, b) => b.totalSold - a.totalSold);

    return mostPopularEvents.map((item) => item.event).slice(0, limit);
  }

  async getFeaturedEvents(query: GetEventsQueryDto) {
    const { limit = 12, page = 1, eventType, status, province, search } = query;

    const skip = (page - 1) * limit;

    const qb = this.eventRepository.createQueryBuilder('event');

    if (eventType) {
      qb.andWhere('event.eventType = :eventType', { eventType });
    }

    if (status) {
      qb.andWhere('event.status = :status', { status });
    }

    if (province) {
      qb.andWhere('event.province ILIKE :province', {
        province: `%${province}%`,
      });
    }

    if (search) {
      qb.andWhere('event.name ILIKE :search', { search: `%${search}%` });
    }

    const totalSoldExpression = `(
      (SELECT COALESCE(SUM("tt"."sold"), 0) FROM "ticket-types" "tt" WHERE "tt"."eventId" = "event"."id")
      +
      (SELECT COALESCE(SUM("stt"."sold"), 0) FROM "ticket-types" "stt" LEFT JOIN "event_sessions" "es" ON "es"."id" = "stt"."eventSessionId" WHERE "es"."eventId" = "event"."id")
    )`;

    const total = await qb.getCount();

    qb.select('event.id', 'id')
      .addSelect(totalSoldExpression, 'totalSold')
      .orderBy('"totalSold"', 'DESC')
      .limit(limit)
      .offset(skip);

    const rawResults = await qb.getRawMany();
    const ids = rawResults.map((r) => r.id);

    let events: EventEntity[] = [];
    if (ids.length > 0) {
      const entities = await this.eventRepository.find({
        where: { id: In(ids) },
        relations: ['organizer', 'sessions'],
      });

      events = ids
        .map((id) => entities.find((e) => e.id === id))
        .filter((e) => e);
    }

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async getEventDetail(id: string): Promise<EventEntity> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['sessions', 'organizer', 'sessions.ticketTypes'],
      order: {
        sessions: {
          startTime: 'ASC',
          ticketTypes: {
            price: 'ASC',
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }
}
