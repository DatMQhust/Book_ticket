import { OrganizerEntity } from '../../organizers/entities/organizer.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { TicketTypeEntity } from '../../ticket-type/entities/ticket-type.entity';
import { EventSessionEntity } from '../../event-session/entities/event-session.entity';
export enum EventStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}
export enum EventType {
  SPORT = 'sport',
  LIVE_MUSIC = 'live music',
  CONCERT = 'concert',
  FESTIVAL = 'festival',
  OTHER = 'other',
}
@Entity('events')
@Unique(['name', 'organizer'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamptz' })
  startSellDate: Date;

  @Column({ type: 'timestamptz' })
  endSellDate: Date;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'varchar', length: 255 })
  province: string;

  @Column({ type: 'varchar', length: 255 })
  ward: string;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.UPCOMING,
  })
  status: EventStatus;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.OTHER,
  })
  eventType: EventType;

  @OneToMany(() => EventSessionEntity, (session) => session.event, {
    cascade: true,
  })
  sessions: EventSessionEntity[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  bannerUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @OneToMany(() => TicketTypeEntity, (ticketType) => ticketType.event)
  ticketTypes: TicketTypeEntity[];

  @ManyToOne(() => OrganizerEntity, (organizer) => organizer.events)
  @JoinColumn({ name: 'organizerId' })
  organizer: OrganizerEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
