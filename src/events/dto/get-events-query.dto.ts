import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, EventStatus } from '../entities/event.entity';

export enum SortBy {
  CREATED_AT = 'createdAt',
  START_SELL_DATE = 'startSellDate',
  END_SELL_DATE = 'endSellDate',
  NAME = 'name',
}

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class GetEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(Order)
  order?: Order = Order.DESC;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
