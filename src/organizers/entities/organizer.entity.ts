import { EventEntity } from '../../events/entities/event.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { OrganizerType, KycStatus } from '../enums/organizer.enum';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';

@Entity('organizers')
export class OrganizerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => UserEntity, (user) => user.organizer, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // KYC
  @Column({
    type: 'enum',
    enum: OrganizerType,
    default: OrganizerType.INDIVIDUAL,
  })
  organizerType: OrganizerType;

  @Column({ nullable: true })
  taxCode: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  website: string;

  @Column({ type: 'jsonb', nullable: true })
  documents: {
    idCardFront?: string;
    idCardBack?: string;
    selfie?: string;
    businessLicense?: string;
  };

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccount: string;

  @Column({ nullable: true })
  bankAccountHolder: string;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  kycStatus: KycStatus;

  @Column({ nullable: true })
  kycRejectedReason: string;

  @Column({ type: 'timestamp', nullable: true })
  kycSubmittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  kycReviewedAt: Date;

  @Column({ nullable: true })
  kycReviewedByAdminId: string;

  @OneToMany(() => EventEntity, (event) => event.organizer)
  events: EventEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
