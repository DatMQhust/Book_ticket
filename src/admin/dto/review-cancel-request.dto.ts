import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReviewCancelDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewCancelRequestDto {
  @IsEnum(ReviewCancelDecision)
  decision: ReviewCancelDecision;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
