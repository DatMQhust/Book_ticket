import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsEmail,
  IsOptional,
  IsUrl,
  IsObject,
} from 'class-validator';
import { OrganizerType } from '../enums/organizer.enum';

export class SubmitKycDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(OrganizerType)
  organizerType: OrganizerType;

  @IsString()
  @IsNotEmpty()
  taxCode: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  bankAccount: string;

  @IsString()
  @IsNotEmpty()
  bankAccountHolder: string;

  @IsObject()
  documents: {
    idCardFront?: string;
    idCardBack?: string;
    selfie?: string;
    businessLicense?: string;
  };
}
