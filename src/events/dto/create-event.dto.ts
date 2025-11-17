// src/event/dto/create-event.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEventSessionDto } from '../../event-session/dto/create-event-session.dto';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startSellDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endSellDate: Date;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  province: string;

  @IsString()
  @IsNotEmpty()
  ward: string;

  // Validate mảng sessions
  @IsArray()
  @ValidateNested({ each: true }) // Validate từng object trong mảng
  @Type(() => CreateEventSessionDto) // Chỉ định kiểu cho mảng lồng
  sessions: CreateEventSessionDto[];
}
