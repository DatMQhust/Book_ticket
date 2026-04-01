import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class JoinWaitingRoomDto {
  @IsUUID()
  ticketTypeId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}
