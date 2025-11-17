// src/event/event.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { Repository, DataSource } from 'typeorm';
import { EventSessionEntity } from '../event-session/entities/event-session.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service'; // Service ta đã làm
import { CreateEventDto } from './dto/create-event.dto';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';

@Injectable()
export class EventService {
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
}
