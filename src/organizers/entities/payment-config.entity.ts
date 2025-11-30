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

  // PayOS Client ID
  @Column({ type: 'varchar' })
  payosClientId: string;

  // PayOS API Key
  @Column({ type: 'varchar' })
  payosApiKey: string;

  // PayOS Checksum Key
  @Column({ type: 'varchar' })
  payosChecksumKey: string;

  // Liên kết 1-1 với Organization (Mỗi BTC có 1 cấu hình thanh toán)
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
