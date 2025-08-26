import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('test')
export class TestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;
}
