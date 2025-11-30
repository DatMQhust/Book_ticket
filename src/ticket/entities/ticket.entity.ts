// ticket.entity.ts
import { UserEntity } from '../../users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderEntity } from '../../order/entities/order.entity';
import { TicketTypeEntity } from '../../ticket-type/entities/ticket-type.entity';

export enum TicketStatus {
  UNCHECKED = 'unchecked',
  CHECKED_IN = 'checked_in',
  CANCELLED = 'cancelled',
}

@Entity('tickets')
export class TicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  accessCode: string;

  @Column({ type: 'timestamptz', nullable: true })
  checkedInAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.tickets)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => OrderEntity, (order) => order.tickets)
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;

  @ManyToOne(() => TicketTypeEntity, (type) => type.tickets)
  @JoinColumn({ name: 'ticket_type_id' })
  ticketType: TicketTypeEntity;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.UNCHECKED })
  status: TicketStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
