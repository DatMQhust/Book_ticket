import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketTypeDto {
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
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  rank?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  sold?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  saleStartTime?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  saleEndTime?: Date;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxPerTransaction?: number;
}
