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

  @Column({ type: 'varchar', length: 11 })
  @Index({ unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToOne(() => OrganizerEntity, (organizer) => organizer.user)
  organizer: OrganizerEntity;

  @OneToMany(() => OrderEntity, (order) => order.user)
  ticketOrders: OrderEntity[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
