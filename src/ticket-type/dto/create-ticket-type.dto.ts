// src/ticket-type/dto/create-ticket-type.dto.ts
import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class CreateTicketTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string; // VD: VIP, Regular

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
  rank: number; // 1: VIP, 2: Standard (Dùng để sắp xếp hiển thị)
}
