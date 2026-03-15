import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReviewChangeDecision {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class ReviewChangeRequestDto {
  @IsEnum(ReviewChangeDecision)
  decision: ReviewChangeDecision;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
