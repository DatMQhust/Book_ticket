import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { EventEntity } from '../events/entities/event.entity';
import { OrderEntity, OrderStatus } from '../order/entities/order.entity';
import { OrganizationPaymentConfigEntity } from '../organizers/entities/payment-config.entity';
import { UpdateSepayConfigDto } from './dto/update-sepay-config.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

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

  async getAllOrganizers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [organizers, total] = await this.organizerRepository.findAndCount({
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

  async getAllEvents(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [events, total] = await this.eventRepository.findAndCount({
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

  async updateUserStatus(userId: string, updateDto: UpdateUserStatusDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
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
      message: 'Sepay configuration updated successfully',
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
      throw new NotFoundException(`Organizer with ID ${organizerId} not found`);
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
        `Payment config for organizer ${organizerId} not found`,
      );
    }

    return config;
  }
}
