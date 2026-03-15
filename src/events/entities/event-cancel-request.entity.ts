import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { EventEntity } from './event.entity';

export enum CancelRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('event_cancel_requests')
export class EventCancelRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => EventEntity)
  @JoinColumn({ name: 'event_id' })
  event: EventEntity;

  @Column({ type: 'text' })
  reason: string;

  // URLs tài liệu chứng minh bất khả kháng (Cloudinary)
  @Column({ type: 'jsonb', nullable: true })
  supportingDocs: string[];

  // Đề xuất của organizer: 'full' | 'partial'
  @Column({ type: 'varchar', default: 'full' })
  refundProposal: string;

  @Column({
    type: 'enum',
    enum: CancelRequestStatus,
    default: CancelRequestStatus.PENDING,
  })
  status: CancelRequestStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
