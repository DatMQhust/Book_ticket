import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { OrderEntity } from '../order/entities/order.entity';
import { OrganizerEntity } from '../organizers/entities/organizer.entity';
import { EventEntity } from '../events/entities/event.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrganizerEntity)
    private readonly organizerRepository: Repository<OrganizerEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {}

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }
  async getUserById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return user;
  }
  async getUserWithPasswordField(email: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }
  private hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
  async create(createUserDto: CreateUserDto) {
    const existed = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existed) {
      throw new Error('Email already exists');
    }
    const hashedPassword = createUserDto.password
      ? this.hashPassword(createUserDto.password)
      : null;

    const newUser = this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      phone: createUserDto.phone || null,
      password: hashedPassword,
      role: createUserDto.role ?? UserRole.USER,
      isActive: true,
    });
    const savedUser = await this.userRepository.save(newUser);
    delete savedUser.password;
    return savedUser;
  }
  isValidPassword(password: string, hashPassword: string): boolean {
    return bcrypt.compareSync(password, hashPassword);
  }

  async updateRefreshToken(id: string, refreshToken: string) {
    const existedUser = await this.userRepository.findOne({ where: { id } });
    if (!existedUser) {
      throw new NotFoundException(`User not found`);
    }
    await this.userRepository.update(id, { refreshToken });
  }

  async validateGoogleUser(googleUser: CreateUserDto) {
    let user = await this.findUserByEmail(googleUser.email);
    if (!user) {
      user = await this.create(googleUser);
    }
    return user;
  }

  async getUserProfileAndActivity(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt'], // Avoid passwords
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Get Orders (Tickets bought)
    const orders = await this.orderRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: [
        'tickets',
        'tickets.ticketType',
        'tickets.ticketType.session',
        'tickets.ticketType.event',
      ],
    });

    const totalTicketsBought = orders.reduce(
      (sum, order) => sum + (order.totalQuantity || 0),
      0,
    );

    const purchaseActivity = orders.map((order) => ({
      type: 'PURCHASE',
      timestamp: order.createdAt,
      details: {
        orderId: order.id,
        amount: order.totalPrice,
        quantity: order.totalQuantity,
        eventName:
          order.tickets?.[0]?.ticketType?.event?.name ||
          order.tickets?.[0]?.ticketType?.session?.event?.name ||
          'Unknown Event',
      },
    }));

    let createdEvents = [];
    let organizerInfo = null;
    let eventsActivity = [];

    if (user.role === UserRole.ORGANIZER) {
      const organizer = await this.organizerRepository.findOne({
        where: { user: { id: userId } },
        relations: ['events'],
      });

      if (organizer) {
        organizerInfo = {
          organizerId: organizer.id,
          organizerName: organizer.name,
        };
        createdEvents = organizer.events || [];

        eventsActivity = createdEvents.map((event) => ({
          type: 'CREATE_EVENT',
          timestamp: event.createdAt,
          details: {
            eventId: event.id,
            eventName: event.name,
            location: event.location,
          },
        }));
      }
    }
    const activities = [...purchaseActivity, ...eventsActivity].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    const participatedEventsMap = new Set();
    orders.forEach((order) => {
      order.tickets.forEach((ticket) => {
        const eventId =
          ticket.ticketType?.event?.id || ticket.ticketType?.session?.event?.id;
        if (eventId) participatedEventsMap.add(eventId);
      });
    });

    return {
      user: {
        ...user,
        organizerInfo,
      },
      stats: {
        totalTicketsBought,
        totalEventsCreated: createdEvents.length,
        totalEventsParticipated: participatedEventsMap.size,
      },
      activityHistory: activities,
    };
  }

  async updateUserProfile(userId: string, updateData: Partial<UserEntity>) {
    const user = await this.getUserById(userId);
    this.userRepository.merge(user, updateData);
    const updatedUser = await this.userRepository.save(user);
    delete updatedUser.password;
    return updatedUser;
  }
}
