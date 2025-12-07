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

  // --- SEPAY CONFIG ---
  // API Key lấy từ SePay (Dùng để verify webhook)
  @Column({ type: 'varchar' })
  sepayApiKey: string;

  // Số tài khoản ngân hàng nhận tiền
  @Column({ type: 'varchar' })
  bankAccount: string;

  // Mã ngân hàng (VD: MB, VCB, TPBank...)
  @Column({ type: 'varchar' })
  bankCode: string;

  // --------------------

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
