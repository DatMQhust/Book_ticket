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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventSessionDto)
  sessions?: CreateEventSessionDto[];
}
