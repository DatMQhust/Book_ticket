import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCollaboratorDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Danh sách eventId được cập nhật',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Mỗi eventId phải là UUID hợp lệ' })
  assignedEventIds?: string[];

  @ApiPropertyOptional({ description: 'Kích hoạt hoặc vô hiệu hoá CTV' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
