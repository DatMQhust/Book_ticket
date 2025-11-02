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
} from 'typeorm';
import { TicketTypeEntity } from '../../ticket-type/entities/ticket-type.entity';
export enum EventStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}
@Entity('events')
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamptz' })
  eventDate: Date;

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

  @OneToMany(() => TicketTypeEntity, (ticket) => ticket.event)
  tickets: TicketTypeEntity[];

  @ManyToOne(() => OrganizerEntity, (organizer) => organizer.events)
  @JoinColumn({ name: 'organizerId' })
  organizer: OrganizerEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
