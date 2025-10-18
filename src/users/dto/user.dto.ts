import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UserDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  role: UserRole;

  @IsBoolean()
  isActive: boolean;
}
