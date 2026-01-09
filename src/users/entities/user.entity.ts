import { TicketEntity } from '../../ticket/entities/ticket.entity';
import { OrderEntity } from '../../order/entities/order.entity';
import { OrganizerEntity } from '../../organizers/entities/organizer.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  OneToMany,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  USER = 'user',
}
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ unique: true })
  @Index({ unique: true })
  email: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  @Index({ unique: true, where: 'phone IS NOT NULL' })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, select: false, nullable: true })
  password: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  refreshToken?: string;

  @OneToOne(() => OrganizerEntity, (organizer) => organizer.user)
  organizer: OrganizerEntity;

  @OneToMany(() => OrderEntity, (order) => order.user)
  ticketOrders: OrderEntity[];

  @OneToMany(() => TicketEntity, (ticket) => ticket.user)
  tickets: TicketEntity[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
