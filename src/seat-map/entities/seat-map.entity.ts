import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventEntity } from '../../events/entities/event.entity';
import { StageElement, ZoneItem } from '../types/seatmap.types';

@Entity('seat_maps')
export class SeatMapEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => EventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: EventEntity;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bgUrl: string | null;

  @Column({ type: 'int', default: 900 })
  canvasWidth: number;

  @Column({ type: 'int', default: 600 })
  canvasHeight: number;

  @Column({ type: 'jsonb', default: [] })
  stageElements: StageElement[];

  @Column({ type: 'jsonb', default: [] })
  zones: ZoneItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
