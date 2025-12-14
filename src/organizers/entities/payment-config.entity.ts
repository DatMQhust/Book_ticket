import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizerEntity } from './organizer.entity';

@Entity('organization_payment_configs')
export class OrganizationPaymentConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  sepayApiKey: string;

  @Column({ type: 'varchar' })
  bankAccount: string;

  @Column({ type: 'varchar' })
  bankCode: string;

  @OneToOne(() => OrganizerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizerId' })
  organizer: OrganizerEntity;

  @Column({ type: 'uuid' })
  organizerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
