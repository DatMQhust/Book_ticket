import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventEntity } from './event.entity';

export enum ChangeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('event_change_requests')
export class EventChangeRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EventEntity)
  @JoinColumn({ name: 'event_id' })
  event: EventEntity;

  // Các trường muốn thay đổi dạng key-value { from, to }
  @Column({ type: 'jsonb' })
  requestedChanges: Record<string, { from: any; to: any }>;

  // Lý do thay đổi (bắt buộc)
  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: ChangeRequestStatus,
    default: ChangeRequestStatus.PENDING,
  })
  status: ChangeRequestStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
