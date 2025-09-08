import { TicketEntity } from '../../ticket/entities/ticket.entity';
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

  @OneToMany(() => TicketEntity, (ticket) => ticket.event)
  tickets: TicketEntity[];
  @ManyToOne(() => OrganizerEntity, (organizer) => organizer.events)
  @JoinColumn({ name: 'organizerId' })
  organizer: OrganizerEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
