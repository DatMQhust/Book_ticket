import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateOrganizerDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;
}
