import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { Repository, DataSource, ILike } from 'typeorm';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateEventDto } from './dto/create-event.dto';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,

    @InjectRepository(EventSessionEntity)
    private readonly sessionRepository: Repository<EventSessionEntity>,

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

    const [events, total] = await this.eventRepository.findAndCount({
      where,
      order: {
        [sortBy]: order,
      },
      take: limit,
      skip,
      relations: ['organizer'],
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

  async getFeaturedEvents(query: GetEventsQueryDto) {
    const {
      limit = 12,
      page = 1,
      sortBy = 'createdAt',
      order = 'DESC',
      eventType,
      status,
      province,
      search,
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

    // Featured events logic: you can add additional criteria here
    // For example: events with most bookings, highest rated, etc.
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
