import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CancelEventRequestDto {
  @IsString()
  @MinLength(10)
  reason: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  supportingDocs?: string[];

  @IsOptional()
  @IsIn(['full', 'partial'])
  refundProposal?: string;
}
