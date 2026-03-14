import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsArray,
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTicketTypeDto } from 'src/ticket-type/dto/create-ticket-type.dto';

export class CreateEventSessionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endTime: Date;

  @IsString()
  @IsOptional()
  sessionLocation?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketTypeDto)
  ticketTypes: CreateTicketTypeDto[];
}
