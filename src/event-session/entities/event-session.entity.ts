import { TicketTypeEntity } from '../../ticket-type/entities/ticket-type.entity';
import { EventEntity } from '../../events/entities/event.entity';
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

export enum SessionStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

@Entity('event_sessions')
export class EventSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @ManyToOne(() => EventEntity, (event) => event.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event: EventEntity;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.UPCOMING,
  })
  status: SessionStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionLocation: string;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @OneToMany(() => TicketTypeEntity, (ticketType) => ticketType.session, {
    cascade: true,
  })
  ticketTypes: TicketTypeEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
