// order.entity.ts
import { UserEntity } from '../../users/entities/user.entity';
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

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed', // Đã thanh toán
  CANCELLED = 'cancelled', // Hủy / Hết hạn
  REFUNDED = 'refunded', // Đã hoàn tiền
}

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, (user) => user.ticketOrders)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'int' })
  totalPrice: number;

  @Column({ type: 'int', default: 0 })
  totalQuantity: number;

  @OneToMany(() => TicketEntity, (ticket) => ticket.order, {
    cascade: true,
  })
  tickets: TicketEntity[];

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string; // VD: 'MOMO', 'STRIPE', 'BANK_TRANSFER'

  @Column({ type: 'varchar', nullable: true })
  transactionId: string; // Mã giao dịch từ phía cổng thanh toán (dùng để tra soát)

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
