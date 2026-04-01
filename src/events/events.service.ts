import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEntity, EventStatus } from './entities/event.entity';
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
import { UpdateEventDto } from './dto/update-event.dto';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { TicketTypeEntity } from '../ticket-type/entities/ticket-type.entity';
import { MailService } from '../mail/mail.service';
import {
  CancelRequestStatus,
  EventCancelRequestEntity,
} from './entities/event-cancel-request.entity';
import { CancelEventRequestDto } from './dto/cancel-event-request.dto';
import {
  ChangeRequestStatus,
  EventChangeRequestEntity,
} from './entities/event-change-request.entity';
import { SubmitChangeRequestDto } from './dto/submit-change-request.dto';
import { TicketEntity, TicketStatus } from '../ticket/entities/ticket.entity';
import { WaitingRoomService } from '../waiting-room/waiting-room.service';
import { ConfigureWaitingRoomDto } from '../waiting-room/dto/configure-waiting-room.dto';
// Fields được phép sửa trực tiếp khi event đã Published (UPCOMING/ONGOING)
const MINOR_EDITABLE_FIELDS = ['description'] as const;
const LOCKED_FIELDS = [
  'name',
  'location',
  'province',
  'startSellDate',
  'endSellDate',
] as const;

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,

    @InjectRepository(EventSessionEntity)
    private readonly sessionRepository: Repository<EventSessionEntity>,

    @InjectRepository(TicketTypeEntity)
    private readonly ticketTypeRepository: Repository<TicketTypeEntity>,

    @InjectRepository(OrganizerEntity)
    private readonly organizerRepository: Repository<OrganizerEntity>,

    @InjectRepository(EventCancelRequestEntity)
    private readonly cancelRequestRepository: Repository<EventCancelRequestEntity>,

    @InjectRepository(EventChangeRequestEntity)
    private readonly changeRequestRepository: Repository<EventChangeRequestEntity>,

    @InjectRepository(TicketEntity)
    private readonly ticketRepository: Repository<TicketEntity>,

    private readonly dataSource: DataSource,

    private readonly cloudinaryService: CloudinaryService,

    private readonly mailService: MailService,

    private readonly waitingRoomService: WaitingRoomService,
  ) {}

  async createEvent(
    createEventDto: CreateEventDto,
    bannerImage: Express.Multer.File,
    mainImage: Express.Multer.File,
    userId: string,
    documentFiles?: {
      venueConfirmation?: Express.Multer.File;
      performanceLicense?: Express.Multer.File;
      fireSafetyPermit?: Express.Multer.File;
      eventInsurance?: Express.Multer.File;
    },
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const uploadPromises: Promise<any>[] = [
        this.cloudinaryService.uploadImage(bannerImage, 'events/banners'),
        this.cloudinaryService.uploadImage(mainImage, 'events/images'),
      ];

      const docKeys = [
        'venueConfirmation',
        'performanceLicense',
        'fireSafetyPermit',
        'eventInsurance',
      ] as const;
      const docUploadEntries = docKeys
        .filter((key) => documentFiles?.[key])
        .map((key) => ({
          key,
          promise: this.cloudinaryService.uploadDocument(
            documentFiles[key],
            'events/documents',
          ),
        }));

      docUploadEntries.forEach(({ promise }) => uploadPromises.push(promise));

      const uploadResults = await Promise.all(uploadPromises);
      const [bannerUpload, imageUpload] = uploadResults;

      const documents: Record<string, string> = {};
      docUploadEntries.forEach(({ key }, index) => {
        documents[key] = (uploadResults[2 + index] as any).secure_url;
      });

      const organizer = await queryRunner.manager.findOne(OrganizerEntity, {
        where: { user: { id: userId } },
      });
      const organizerId = organizer.id;
      const event = this.eventRepository.create({
        ...createEventDto,
        bannerUrl: bannerUpload.secure_url,
        imageUrl: imageUpload.secure_url,
        documents: Object.keys(documents).length > 0 ? documents : null,
        organizer: { id: organizerId } as OrganizerEntity,
        sessions: [],
      });

      const savedEvent = await queryRunner.manager.save(event);

      const hasSessions =
        createEventDto.sessions && createEventDto.sessions.length > 0;
      const hasRootTickets =
        createEventDto.ticketTypes && createEventDto.ticketTypes.length > 0;

      if (hasSessions && hasRootTickets) {
        throw new BadRequestException(
          'Cannot provide both sessions and ticketTypes. Use sessions for multi-session events or ticketTypes for single events.',
        );
      }

      if (hasSessions) {
        // Chế độ nhiều suất: vé gắn với từng session
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
      } else if (hasRootTickets) {
        // Chế độ sự kiện đơn: vé gắn thẳng vào event
        const ticketTypes = createEventDto.ticketTypes.map((ticketDto) => {
          return this.ticketTypeRepository.create({
            name: ticketDto.name,
            price: ticketDto.price,
            quantity: ticketDto.quantity,
            description: ticketDto.description || '',
            rank: ticketDto.rank || 1,
            sold: 0,
            event: savedEvent,
            session: null,
          });
        });

        await queryRunner.manager.save(ticketTypes);
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

    const PUBLIC_STATUSES = [
      EventStatus.UPCOMING,
      EventStatus.ONGOING,
      EventStatus.ENDED,
    ];

    const where: any = {};

    if (eventType) {
      where.eventType = eventType;
    }

    where.status = status ? status : In(PUBLIC_STATUSES);

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
      relations: [
        'sessions',
        'organizer',
        'organizer.user',
        'sessions.ticketTypes',
        'ticketTypes',
      ],
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

  // ─── Organizer event lifecycle ────────────────────────────────────────────

  async getOrganizerEvents(userId: string): Promise<EventEntity[]> {
    const organizer = await this.organizerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    return this.eventRepository.find({
      where: { organizer: { id: organizer.id } },
      relations: ['sessions'],
      order: { createdAt: 'DESC' },
    });
  }

  async submitForReview(eventId: string, userId: string): Promise<EventEntity> {
    const organizer = await this.organizerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizer: { id: organizer.id } },
      relations: ['organizer', 'organizer.user'],
    });
    if (!event) {
      throw new NotFoundException(
        'Event not found or not owned by this organizer',
      );
    }

    if (
      event.status !== EventStatus.DRAFT &&
      event.status !== EventStatus.NEEDS_REVISION
    ) {
      throw new BadRequestException(
        'Only DRAFT or NEEDS_REVISION events can be submitted for review',
      );
    }

    event.status = EventStatus.PENDING_REVIEW;
    event.submittedAt = new Date();
    const saved = await this.eventRepository.save(event);

    await this.mailService.sendEventSubmitted({
      to: event.organizer.user.email,
      organizerName: event.organizer.name,
      eventName: event.name,
    });

    return saved;
  }

  async updateEvent(
    eventId: string,
    userId: string,
    dto: UpdateEventDto,
    bannerImage?: Express.Multer.File,
    mainImage?: Express.Multer.File,
  ): Promise<EventEntity> {
    const organizer = await this.organizerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizer: { id: organizer.id } },
    });
    if (!event) {
      throw new NotFoundException(
        'Event not found or not owned by this organizer',
      );
    }

    // ── Minor edit mode: UPCOMING / ONGOING ──────────────────────────────────
    if (
      event.status === EventStatus.UPCOMING ||
      event.status === EventStatus.ONGOING
    ) {
      const hasLockedField = LOCKED_FIELDS.some(
        (field) => dto[field] !== undefined,
      );
      if (hasLockedField || dto.sessions || dto.ticketTypes) {
        throw new BadRequestException(
          'Only description and main image can be edited after publishing. Use change-request for core field changes.',
        );
      }

      // Chỉ áp dụng các field được phép
      MINOR_EDITABLE_FIELDS.forEach((field) => {
        if (dto[field] !== undefined) {
          (event as any)[field] = dto[field];
        }
      });

      if (mainImage) {
        const upload = await this.cloudinaryService.uploadImage(
          mainImage,
          'events/images',
        );
        event.imageUrl = upload.secure_url;
      }

      return this.eventRepository.save(event);
    }

    // ── Full edit mode: DRAFT / NEEDS_REVISION ───────────────────────────────
    if (
      event.status !== EventStatus.DRAFT &&
      event.status !== EventStatus.NEEDS_REVISION
    ) {
      throw new BadRequestException(
        'Only DRAFT or NEEDS_REVISION events can be fully edited',
      );
    }

    // Update scalar fields (exclude sessions/ticketTypes — managed separately)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sessions, ticketTypes, ...scalarFields } = dto;
    Object.assign(event, scalarFields);

    if (bannerImage) {
      const upload = await this.cloudinaryService.uploadImage(
        bannerImage,
        'events/banners',
      );
      event.bannerUrl = upload.secure_url;
    }

    if (mainImage) {
      const upload = await this.cloudinaryService.uploadImage(
        mainImage,
        'events/images',
      );
      event.imageUrl = upload.secure_url;
    }

    return this.eventRepository.save(event);
  }

  async deleteEvent(
    eventId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const organizer = await this.organizerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizer: { id: organizer.id } },
    });
    if (!event) {
      throw new NotFoundException(
        'Event not found or not owned by this organizer',
      );
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT events can be deleted');
    }

    await this.eventRepository.softDelete(eventId);
    return { message: 'Event deleted successfully' };
  }

  // ─── Huỷ sự kiện ─────────────────────────────────────────────────────────

  async cancelRequest(
    eventId: string,
    userId: string,
    dto: CancelEventRequestDto,
  ): Promise<EventCancelRequestEntity> {
    const organizer = await this.organizerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizer: { id: organizer.id } },
    });
    if (!event) {
      throw new NotFoundException(
        'Event not found or not owned by this organizer',
      );
    }

    if (
      event.status !== EventStatus.UPCOMING &&
      event.status !== EventStatus.ONGOING
    ) {
      throw new BadRequestException(
        'Only UPCOMING or ONGOING events can be cancelled',
      );
    }

    const existing = await this.cancelRequestRepository.findOne({
      where: { event: { id: eventId }, status: CancelRequestStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException(
        'A cancel request is already pending for this event',
      );
    }

    const cancelRequest = this.cancelRequestRepository.create({
      event,
      reason: dto.reason,
      supportingDocs: dto.supportingDocs ?? null,
      refundProposal: dto.refundProposal ?? 'full',
    });

    return this.cancelRequestRepository.save(cancelRequest);
  }

  // ─── Thống kê sự kiện ─────────────────────────────────────────────────────

  async getEventStats(eventId: string, userId: string) {
    const organizer = await this.organizerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizer: { id: organizer.id } },
      relations: ['ticketTypes', 'sessions', 'sessions.ticketTypes'],
    });
    if (!event) {
      throw new NotFoundException(
        'Event not found or not owned by this organizer',
      );
    }

    const rootTicketTypes = event.ticketTypes ?? [];
    const sessionTicketTypes = (event.sessions ?? []).flatMap(
      (s) => s.ticketTypes ?? [],
    );
    const allTicketTypes = [...rootTicketTypes, ...sessionTicketTypes];

    // Count checked-in per ticketType via JOIN
    let checkedInMap = new Map<string, number>();
    if (allTicketTypes.length > 0) {
      const checkedInCounts = await this.ticketRepository
        .createQueryBuilder('ticket')
        .leftJoin('ticket.ticketType', 'tt')
        .select('tt.id', 'ticketTypeId')
        .addSelect('COUNT(ticket.id)', 'count')
        .where('tt.id IN (:...ids)', {
          ids: allTicketTypes.map((tt) => tt.id),
        })
        .andWhere('ticket.status = :status', {
          status: TicketStatus.CHECKED_IN,
        })
        .groupBy('tt.id')
        .getRawMany();

      checkedInMap = new Map(
        checkedInCounts.map((r) => [r.ticketTypeId, parseInt(r.count, 10)]),
      );
    }

    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let totalCheckedIn = 0;

    const byTicketType = allTicketTypes.map((tt) => {
      const checkedIn = checkedInMap.get(tt.id) ?? 0;
      totalRevenue += tt.price * tt.sold;
      totalTicketsSold += tt.sold;
      totalCheckedIn += checkedIn;
      return {
        ticketTypeId: tt.id,
        name: tt.name,
        price: tt.price,
        totalQuantity: tt.quantity,
        sold: tt.sold,
        checkedIn,
      };
    });

    const bySession =
      event.sessions && event.sessions.length > 0
        ? event.sessions.map((s) => {
            const sessionCheckedIn = (s.ticketTypes ?? []).reduce(
              (sum, tt) => sum + (checkedInMap.get(tt.id) ?? 0),
              0,
            );
            return {
              sessionId: s.id,
              name: s.name,
              startTime: s.startTime,
              checkedIn: sessionCheckedIn,
            };
          })
        : null;

    return {
      eventId: event.id,
      totalRevenue,
      totalTicketsSold,
      totalCheckedIn,
      byTicketType,
      bySession,
    };
  }

  // ─── Yêu cầu thay đổi thông tin ──────────────────────────────────────────

  async submitChangeRequest(
    eventId: string,
    userId: string,
    dto: SubmitChangeRequestDto,
  ): Promise<EventChangeRequestEntity> {
    const organizer = await this.organizerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizer: { id: organizer.id } },
    });
    if (!event) {
      throw new NotFoundException(
        'Event not found or not owned by this organizer',
      );
    }

    if (
      event.status !== EventStatus.UPCOMING &&
      event.status !== EventStatus.ONGOING
    ) {
      throw new BadRequestException(
        'Change requests can only be submitted for UPCOMING or ONGOING events',
      );
    }

    const existing = await this.changeRequestRepository.findOne({
      where: { event: { id: eventId }, status: ChangeRequestStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException(
        'A change request is already pending for this event',
      );
    }

    const changeRequest = this.changeRequestRepository.create({
      event,
      requestedChanges: dto.requestedChanges,
      reason: dto.reason,
    });

    return this.changeRequestRepository.save(changeRequest);
  }

  // ─── Waiting Room ──────────────────────────────────────────────────────────

  async configureWaitingRoom(
    eventId: string,
    userId: string,
    dto: ConfigureWaitingRoomDto,
  ): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['organizer', 'organizer.user'],
      select: {
        id: true,
        organizer: { user: { id: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện.');
    }
    if (event.organizer.user.id !== userId) {
      throw new ForbiddenException('Bạn không có quyền cấu hình sự kiện này.');
    }

    await this.waitingRoomService.configureRoom(eventId, dto);
  }

  async getWaitingRoomStatus(eventId: string, userId: string) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['organizer', 'organizer.user'],
      select: {
        id: true,
        organizer: { user: { id: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện.');
    }
    if (event.organizer.user.id !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem thông tin sự kiện này.',
      );
    }

    return this.waitingRoomService.getRoomStatus(eventId);
  }
}
