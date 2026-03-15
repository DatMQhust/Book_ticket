import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { KycStatus } from '../organizers/enums/organizer.enum';
import { EventEntity, EventStatus } from '../events/entities/event.entity';
import { OrderEntity, OrderStatus } from '../order/entities/order.entity';
import { OrganizationPaymentConfigEntity } from '../organizers/entities/payment-config.entity';
import { UpdateSepayConfigDto } from './dto/update-sepay-config.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { ReviewEventDecision, ReviewEventDto } from './dto/review-event.dto';
import { MailService } from '../mail/mail.service';
import {
  CancelRequestStatus,
  EventCancelRequestEntity,
} from '../events/entities/event-cancel-request.entity';
import {
  ReviewCancelDecision,
  ReviewCancelRequestDto,
} from './dto/review-cancel-request.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OrganizerEntity)
    private readonly organizerRepository: Repository<OrganizerEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrganizationPaymentConfigEntity)
    private readonly paymentConfigRepository: Repository<OrganizationPaymentConfigEntity>,
    @InjectRepository(EventCancelRequestEntity)
    private readonly cancelRequestRepository: Repository<EventCancelRequestEntity>,
    @InjectQueue('batch-refund')
    private readonly batchRefundQueue: Queue,
    private readonly mailService: MailService,
  ) {}

  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      select: [
        'id',
        'name',
        'email',
        'phone',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllOrganizers(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    let whereClause = {};
    if (status) {
      whereClause = { kycStatus: status };
    }

    const [organizers, total] = await this.organizerRepository.findAndCount({
      where: whereClause,
      skip,
      take: limit,
      relations: ['user', 'events'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: organizers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllEvents(page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as EventStatus } : {};

    const [events, total] = await this.eventRepository.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['organizer', 'organizer.user'],
      order: { createdAt: 'DESC' },
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

  async getEventDetail(eventId: string): Promise<EventEntity> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: [
        'organizer',
        'organizer.user',
        'sessions',
        'sessions.ticketTypes',
        'ticketTypes',
      ],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return event;
  }

  async reviewEvent(
    eventId: string,
    adminId: string,
    dto: ReviewEventDto,
  ): Promise<EventEntity> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['organizer', 'organizer.user'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.status !== EventStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Only PENDING_REVIEW events can be reviewed',
      );
    }

    const { decision, adminNotes, feePercentage } = dto;
    event.reviewedAt = new Date();

    if (decision === ReviewEventDecision.APPROVED) {
      event.status = EventStatus.UPCOMING;
      event.feePercentage = feePercentage;
      event.adminNotes = null;
      await this.eventRepository.save(event);

      await this.mailService.sendEventApproved({
        to: event.organizer.user.email,
        organizerName: event.organizer.name,
        eventName: event.name,
        eventUrl: `${process.env.CLIENT_URL}/events/${event.id}`,
        platformFeePercent: feePercentage,
      });
    } else if (decision === ReviewEventDecision.NEEDS_REVISION) {
      event.status = EventStatus.NEEDS_REVISION;
      event.adminNotes = adminNotes;
      await this.eventRepository.save(event);

      await this.mailService.sendEventNeedsRevision({
        to: event.organizer.user.email,
        organizerName: event.organizer.name,
        eventName: event.name,
        notes: adminNotes,
        editUrl: `${process.env.CLIENT_URL}/organizer/events/${event.id}/edit`,
      });
    } else {
      // REJECTED
      event.status = EventStatus.REJECTED;
      event.adminNotes = adminNotes;
      await this.eventRepository.save(event);

      await this.mailService.sendEventRejected({
        to: event.organizer.user.email,
        organizerName: event.organizer.name,
        eventName: event.name,
        reason: adminNotes,
      });
    }

    // Suppress adminId lint warning — reserved for audit log
    void adminId;

    return event;
  }

  async updateUserStatus(userId: string, updateDto: UpdateUserStatusDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy User với ID ${userId}`);
    }

    user.isActive = updateDto.isActive;
    await this.userRepository.save(user);

    return {
      message: 'User status updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    };
  }

  async updateSepayConfig(
    organizerId: string,
    updateDto: UpdateSepayConfigDto,
  ) {
    const organizer = await this.organizerRepository.findOne({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new NotFoundException(`Organizer with ID ${organizerId} not found`);
    }

    let paymentConfig = await this.paymentConfigRepository.findOne({
      where: { organizerId },
    });

    if (paymentConfig) {
      paymentConfig.sepayApiKey = updateDto.sepayApiKey;
      paymentConfig.bankAccount = updateDto.bankAccount;
      paymentConfig.bankCode = updateDto.bankCode;
    } else {
      paymentConfig = this.paymentConfigRepository.create({
        organizerId,
        sepayApiKey: updateDto.sepayApiKey,
        bankAccount: updateDto.bankAccount,
        bankCode: updateDto.bankCode,
      });
    }

    await this.paymentConfigRepository.save(paymentConfig);

    return {
      message: 'Cập nhật cấu hình thanh toán Sepay thành công',
      config: paymentConfig,
    };
  }

  async getOrganizerRevenue(
    organizerId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const organizer = await this.organizerRepository.findOne({
      where: { id: organizerId },
      relations: ['user', 'events'],
    });

    if (!organizer) {
      throw new NotFoundException(
        `Không tìm thấy Organizer với ID ${organizerId}`,
      );
    }

    const eventIds = organizer.events.map((event) => event.id);
    if (eventIds.length === 0) {
      return {
        organizerId,
        organizerName: organizer.name,
        totalRevenue: 0,
        completedOrders: 0,
        totalOrders: 0,
        events: [],
      };
    }

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.tickets', 'ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('ticketType.event', 'directEvent')
      .leftJoinAndSelect('ticketType.session', 'session')
      .leftJoinAndSelect('session.event', 'sessionEvent')
      .where(
        '(directEvent.id IN (:...eventIds) OR sessionEvent.id IN (:...eventIds))',
        { eventIds },
      );

    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate });
    }

    const allOrders = await queryBuilder.getMany();

    const completedOrders = allOrders.filter(
      (order) => order.status === OrderStatus.COMPLETED,
    );

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + order.totalPrice,
      0,
    );

    const eventRevenueMap = new Map<
      string,
      {
        eventId: string;
        eventName: string;
        revenue: number;
        orderCount: number;
      }
    >();

    for (const order of completedOrders) {
      for (const ticket of order.tickets) {
        if (ticket.ticketType) {
          const event =
            ticket.ticketType.session?.event || ticket.ticketType.event;

          if (event) {
            const existing = eventRevenueMap.get(event.id) || {
              eventId: event.id,
              eventName: event.name,
              revenue: 0,
              orderCount: 0,
            };

            existing.revenue += ticket.ticketType.price;
            eventRevenueMap.set(event.id, existing);
          }
        }
      }
    }

    for (const order of completedOrders) {
      const eventIdsInOrder = new Set<string>();
      for (const ticket of order.tickets) {
        if (ticket.ticketType) {
          const event =
            ticket.ticketType.session?.event || ticket.ticketType.event;
          if (event) {
            eventIdsInOrder.add(event.id);
          }
        }
      }

      for (const eventId of eventIdsInOrder) {
        const existing = eventRevenueMap.get(eventId);
        if (existing) {
          existing.orderCount += 1;
        }
      }
    }

    const eventRevenue = Array.from(eventRevenueMap.values());

    return {
      organizerId,
      organizerName: organizer.name,
      totalRevenue,
      completedOrders: completedOrders.length,
      totalOrders: allOrders.length,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      events: eventRevenue,
    };
  }

  async getSepayConfig(organizerId: string) {
    const config = await this.paymentConfigRepository.findOne({
      where: { organizerId },
      relations: ['organizer'],
    });

    if (!config) {
      throw new NotFoundException(
        `Không tìm thấy cấu hình thanh toán của organizer ${organizerId}`,
      );
    }

    return config;
  }

  // ─── Huỷ sự kiện ─────────────────────────────────────────────────────────

  async getCancelRequests(status?: string) {
    const where = status ? { status: status as CancelRequestStatus } : {};

    return this.cancelRequestRepository.find({
      where,
      relations: ['event', 'event.organizer', 'event.organizer.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async approveCancellation(
    eventId: string,
    dto: ReviewCancelRequestDto,
  ): Promise<{ message: string }> {
    const cancelRequest = await this.cancelRequestRepository.findOne({
      where: { event: { id: eventId }, status: CancelRequestStatus.PENDING },
      relations: [
        'event',
        'event.sessions',
        'event.organizer',
        'event.organizer.user',
      ],
    });

    if (!cancelRequest) {
      throw new NotFoundException(
        `No pending cancel request found for event ${eventId}`,
      );
    }

    if (dto.decision === ReviewCancelDecision.APPROVED) {
      cancelRequest.status = CancelRequestStatus.APPROVED;
      cancelRequest.adminNotes = dto.adminNotes ?? null;
      await this.cancelRequestRepository.save(cancelRequest);

      // Đóng bán vé ngay lập tức
      await this.eventRepository.update(eventId, {
        endSellDate: new Date(),
      });

      const eventName = cancelRequest.event.name;
      const eventDate =
        cancelRequest.event.sessions?.[0]?.startTime?.toLocaleDateString(
          'vi-VN',
        ) ?? '';

      // Enqueue chunk đầu tiên — processor tự re-enqueue các chunk tiếp theo
      await this.batchRefundQueue.add(
        'process-refund',
        { eventId, offset: 0, eventName, eventDate },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );

      // Thông báo Organizer
      await this.mailService.sendCancelRequestApproved({
        to: cancelRequest.event.organizer.user.email,
        organizerName: cancelRequest.event.organizer.name,
        eventName: cancelRequest.event.name,
      });

      return { message: 'Cancel request approved. Batch refund enqueued.' };
    } else {
      // REJECTED
      cancelRequest.status = CancelRequestStatus.REJECTED;
      cancelRequest.adminNotes = dto.adminNotes ?? null;
      await this.cancelRequestRepository.save(cancelRequest);

      // Thông báo Organizer
      await this.mailService.sendCancelRequestRejected({
        to: cancelRequest.event.organizer.user.email,
        organizerName: cancelRequest.event.organizer.name,
        eventName: cancelRequest.event.name,
        reason: dto.adminNotes ?? 'Không đủ điều kiện để huỷ sự kiện',
      });

      return { message: 'Cancel request rejected.' };
    }
  }

  async reviewKycApplication(
    adminId: string,
    organizerId: string,
    reviewDto: ReviewKycDto,
  ) {
    const organizer = await this.organizerRepository.findOne({
      where: { id: organizerId },
      relations: ['user'],
    });

    if (!organizer) {
      throw new NotFoundException(
        `Không tìm thấy Organizer với ID ${organizerId}`,
      );
    }

    const { decision, rejectedReason } = reviewDto;

    if (
      (decision === KycStatus.REJECTED ||
        decision === KycStatus.NEEDS_REVISION) &&
      !rejectedReason
    ) {
      throw new Error(
        `Vui lòng cung cấp lý do (rejectedReason) khi quyết định là ${decision}`,
      );
    }

    organizer.kycStatus = decision;
    organizer.kycReviewedAt = new Date();
    organizer.kycReviewedByAdminId = adminId;
    if (
      decision === KycStatus.REJECTED ||
      decision === KycStatus.NEEDS_REVISION
    ) {
      organizer.kycRejectedReason = rejectedReason;
    } else {
      organizer.kycRejectedReason = null;
    }

    await this.organizerRepository.save(organizer);

    // Update user role if approved
    if (decision === KycStatus.APPROVED) {
      if (organizer.user) {
        organizer.user.role = UserRole.ORGANIZER;
        await this.userRepository.save(organizer.user);
      }

      await this.mailService.sendKycApproved({
        to: organizer.user.email,
        organizerName: organizer.name,
      });
    } else if (
      decision === KycStatus.REJECTED ||
      decision === KycStatus.NEEDS_REVISION
    ) {
      await this.mailService.sendKycRejected({
        to: organizer.user.email,
        organizerName: organizer.name,
        reason: rejectedReason,
        resubmitDeadlineDays: 7,
      });
    }

    return organizer;
  }
}
