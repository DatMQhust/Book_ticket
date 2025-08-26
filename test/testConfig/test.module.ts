import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestEntity } from './test.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TestEntity])],
})
export class TestModule {}
