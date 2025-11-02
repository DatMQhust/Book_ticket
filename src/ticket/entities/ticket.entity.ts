import { UserEntity } from '../../users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderEntity } from '../../order/entities/order.entity';
import { TicketTypeEntity } from '../../ticket-type/entities/ticket-type.entity';

export enum TicketStatus {
  UNCHECKED = 'unchecked', // Vé chưa check-in
  CHECKED_IN = 'checked_in', // Vé đã check-in
}

@Entity('tickets')
export class TicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string; // ID này sẽ dùng để sinh QR code

  @ManyToOne(() => UserEntity, (user) => user.tickets) // Liên kết với User
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => OrderEntity, (order) => order.tickets) // Liên kết với Order
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;

  @ManyToOne(() => TicketTypeEntity, (type) => type.tickets) // Liên kết với Loại vé
  @JoinColumn({ name: 'ticket_type_id' })
  ticketType: TicketTypeEntity;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.UNCHECKED })
  status: TicketStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
