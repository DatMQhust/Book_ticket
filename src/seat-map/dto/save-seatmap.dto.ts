import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class StageElementDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  shapeType: 'rect' | 'circle' | 'polygon';

  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  radius?: number;

  @IsArray()
  @IsOptional()
  points?: number[];

  @IsNumber()
  @IsOptional()
  rotation?: number;

  @IsString()
  @IsNotEmpty()
  fill: string;

  @IsString()
  label: string;
}

class ZoneItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsUUID()
  ticketTypeId: string;

  @IsString()
  shapeType: 'rect' | 'circle' | 'polygon';

  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  radius?: number;

  @IsArray()
  @IsOptional()
  points?: number[];

  @IsNumber()
  @IsOptional()
  rotation?: number;

  @IsString()
  @IsNotEmpty()
  fill: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  opacity: number;

  @IsString()
  label: string;
}

export class SaveSeatMapDto {
  @IsInt()
  @Min(100)
  canvasWidth: number;

  @IsInt()
  @Min(100)
  canvasHeight: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageElementDto)
  stageElements: StageElementDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoneItemDto)
  zones: ZoneItemDto[];
}
