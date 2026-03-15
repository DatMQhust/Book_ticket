import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteCollaboratorDto {
  @ApiProperty({ example: 'ctv@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    type: [String],
    description: 'Danh sách eventId được phép check-in',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải giao ít nhất 1 sự kiện cho CTV' })
  @IsUUID('4', { each: true, message: 'Mỗi eventId phải là UUID hợp lệ' })
  assignedEventIds: string[];
}
