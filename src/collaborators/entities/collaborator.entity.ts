import { OrganizerEntity } from '../../organizers/entities/organizer.entity';
import { UserEntity } from '../../users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('collaborators')
export class CollaboratorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => OrganizerEntity, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'organizerId' })
  organizer: OrganizerEntity;

  /**
   * Danh sách eventId mà CTV được phép check-in
   */
  @Column({ type: 'uuid', array: true, default: [] })
  assignedEventIds: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  invitedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
