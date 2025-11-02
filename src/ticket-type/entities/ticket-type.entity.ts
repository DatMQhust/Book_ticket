import { OrderEntity } from '../../order/entities/order.entity';
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
import { TicketEntity } from '../../ticket/entities/ticket.entity';

export enum TicketStatus {
  AVAILABLE = 'available',
  SOLD_OUT = 'sold_out',
}
@Entity('ticket-types')
export class TicketTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  rank: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  sold: number;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.AVAILABLE })
  status: TicketStatus;

  @ManyToOne(() => EventEntity, (event) => event.tickets)
  @JoinColumn({ name: 'eventId' })
  event: EventEntity;

  @OneToMany(() => TicketEntity, (ticket) => ticket.ticketType)
  tickets: TicketEntity[];

  @OneToMany(() => OrderEntity, (order) => order.tickets)
  ticketOrders: OrderEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
