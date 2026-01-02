import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class AddTicketTypeToEventDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsInt()
  @IsOptional()
  rank?: number;
}
