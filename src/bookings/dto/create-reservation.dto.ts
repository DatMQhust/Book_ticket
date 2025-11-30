import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  ticketTypeId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}
