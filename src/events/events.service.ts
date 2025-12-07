// src/event/event.service.ts
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { Repository, DataSource } from 'typeorm';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service'; // Service ta đã làm
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventDto, EventSortBy } from './dto/query-event.dto';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,

    @InjectRepository(EventSessionEntity)
    private readonly sessionRepository: Repository<EventSessionEntity>,

    // Inject DataSource để dùng Transaction
    private readonly dataSource: DataSource,

    // Inject Cloudinary Service
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createEvent(
    createEventDto: CreateEventDto,
    bannerImage: Express.Multer.File,
    mainImage: Express.Multer.File,
    userId: string,
  ) {
    // 1. Khởi tạo QueryRunner cho Transaction
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

      const sessions = createEventDto.sessions.map((sessionDto) => {
        return this.sessionRepository.create({
          ...sessionDto,
          event: savedEvent,
        });
      });

      await queryRunner.manager.save(sessions);
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

  async getEvents(query: QueryEventDto) {
    const {
      search,
      province,
      ward,
      location,
      eventType,
      status,
      startDate,
      endDate,
      sortBy = EventSortBy.CREATED_AT,
      order = 'DESC',
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .leftJoinAndSelect('event.sessions', 'sessions');

    // Search in name and description
    if (search) {
      queryBuilder.andWhere(
        '(event.name ILIKE :search OR event.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by province
    if (province) {
      queryBuilder.andWhere('event.province ILIKE :province', {
        province: `%${province}%`,
      });
    }

    // Filter by ward
    if (ward) {
      queryBuilder.andWhere('event.ward ILIKE :ward', {
        ward: `%${ward}%`,
      });
    }

    // Filter by location
    if (location) {
      queryBuilder.andWhere('event.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    // Filter by event type
    if (eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', { eventType });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('event.status = :status', { status });
    }

    // Filter by date range (using startSellDate)
    if (startDate && endDate) {
      queryBuilder.andWhere(
        'event.startSellDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    } else if (startDate) {
      queryBuilder.andWhere('event.startSellDate >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('event.startSellDate <= :endDate', { endDate });
    }

    // Sorting
    const sortField =
      sortBy === EventSortBy.START_DATE
        ? 'event.startSellDate'
        : sortBy === EventSortBy.NAME
          ? 'event.name'
          : 'event.createdAt';

    queryBuilder.orderBy(sortField, order);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [events, total] = await queryBuilder.getManyAndCount();

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

  async getFeaturedEvents(query: QueryEventDto) {
    const {
      search,
      province,
      ward,
      location,
      eventType,
      status,
      startDate,
      endDate,
      sortBy = EventSortBy.CREATED_AT,
      order = 'DESC',
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .leftJoinAndSelect('event.sessions', 'sessions')
      .where('event.status = :status', { status: 'upcoming' }); // Featured events are upcoming events

    // Search in name and description
    if (search) {
      queryBuilder.andWhere(
        '(event.name ILIKE :search OR event.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by province
    if (province) {
      queryBuilder.andWhere('event.province ILIKE :province', {
        province: `%${province}%`,
      });
    }

    // Filter by ward
    if (ward) {
      queryBuilder.andWhere('event.ward ILIKE :ward', {
        ward: `%${ward}%`,
      });
    }

    // Filter by location
    if (location) {
      queryBuilder.andWhere('event.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    // Filter by event type
    if (eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', { eventType });
    }

    // Override status filter if provided
    if (status) {
      queryBuilder.andWhere('event.status = :statusParam', {
        statusParam: status,
      });
    }

    // Filter by date range (using startSellDate)
    if (startDate && endDate) {
      queryBuilder.andWhere(
        'event.startSellDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    } else if (startDate) {
      queryBuilder.andWhere('event.startSellDate >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('event.startSellDate <= :endDate', { endDate });
    }

    // Sorting
    const sortField =
      sortBy === EventSortBy.START_DATE
        ? 'event.startSellDate'
        : sortBy === EventSortBy.NAME
          ? 'event.name'
          : 'event.createdAt';

    queryBuilder.orderBy(sortField, order);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [events, total] = await queryBuilder.getManyAndCount();

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
