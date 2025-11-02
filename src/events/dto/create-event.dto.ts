import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  location: string;

  @IsNotEmpty()
  province: string;

  @IsNotEmpty()
  ward: string;

  @IsNotEmpty()
  organizerId: string;

  @IsDateString()
  @IsNotEmpty()
  startSellDate: Date;

  @IsDateString()
  @IsNotEmpty()
  endSellDate: string;
}
