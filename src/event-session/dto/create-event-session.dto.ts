// src/event-session/dto/create-event-session.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTicketTypeDto } from 'src/ticket-type/dto/create-ticket-type.dto';

export class CreateEventSessionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // Dùng @Type(() => Date) để class-transformer
  // tự động biến chuỗi ISO (string) thành object Date
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endTime: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketTypeDto)
  ticketTypes: CreateTicketTypeDto[];
}
