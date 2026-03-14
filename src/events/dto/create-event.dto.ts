import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEventSessionDto } from '../../event-session/dto/create-event-session.dto';
import { CreateTicketTypeDto } from '../../ticket-type/dto/create-ticket-type.dto';

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

  // Chế độ nhiều suất diễn: vé gắn với từng session
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventSessionDto)
  sessions?: CreateEventSessionDto[];

  // Chế độ sự kiện đơn: vé gắn thẳng vào event (không dùng sessions)
  // Mutual exclusion: không thể có cả sessions lẫn ticketTypes cùng lúc
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketTypeDto)
  ticketTypes?: CreateTicketTypeDto[];
}
