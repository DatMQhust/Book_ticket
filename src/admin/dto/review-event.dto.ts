import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export enum ReviewEventDecision {
  APPROVED = 'APPROVED',
  NEEDS_REVISION = 'NEEDS_REVISION',
  REJECTED = 'REJECTED',
}

export class ReviewEventDto {
  @IsEnum(ReviewEventDecision)
  decision: ReviewEventDecision;

  @ValidateIf(
    (o) =>
      o.decision === ReviewEventDecision.NEEDS_REVISION ||
      o.decision === ReviewEventDecision.REJECTED,
  )
  @IsString()
  adminNotes: string;

  @ValidateIf((o) => o.decision === ReviewEventDecision.APPROVED)
  @IsNumber()
  @Min(0)
  @Max(100)
  feePercentage: number;
}
