import { IsNotEmpty, IsString } from 'class-validator';

export class CheckInTicketDto {
  @IsNotEmpty()
  @IsString()
  accessCode: string;
}
