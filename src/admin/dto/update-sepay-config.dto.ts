import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSepayConfigDto {
  @IsString()
  @IsNotEmpty()
  sepayApiKey: string;

  @IsString()
  @IsNotEmpty()
  bankAccount: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;
}
