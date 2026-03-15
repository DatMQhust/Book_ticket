import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class SubmitChangeRequestDto {
  @IsObject()
  requestedChanges: Record<string, { from: any; to: any }>;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
