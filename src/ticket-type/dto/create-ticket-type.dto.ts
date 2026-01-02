import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

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
}
