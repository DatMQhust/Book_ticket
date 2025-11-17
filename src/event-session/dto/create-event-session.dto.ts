// src/event-session/dto/create-event-session.dto.ts
import { IsString, IsNotEmpty, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventSessionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // Dùng @Type(() => Date) để class-transformer
  // tự động biến chuỗi ISO (string) thành object Date
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endTime: Date;
}
