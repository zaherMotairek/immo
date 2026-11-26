import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import type { RepairUrgency } from '@prisma/client';

export class CreateRepairDto {
  @IsUUID()
  buildingId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH'])
  urgency?: RepairUrgency;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}