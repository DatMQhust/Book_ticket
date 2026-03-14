import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../organizers/enums/organizer.enum';

export class ReviewKycDto {
  @IsEnum([KycStatus.APPROVED, KycStatus.REJECTED, KycStatus.NEEDS_REVISION])
  decision: KycStatus;

  @IsOptional()
  @IsString()
  rejectedReason?: string;
}
