import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ConfigureWaitingRoomDto {
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  @Min(1)
  @Max(500)
  maxConcurrent: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(50000)
  maxQueueSize?: number;
}
