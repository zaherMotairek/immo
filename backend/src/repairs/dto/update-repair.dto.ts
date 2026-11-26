import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { RepairStatus, RepairUrgency } from '@prisma/client';

export class UpdateRepairDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH'])
  urgency?: RepairUrgency;

  @IsOptional()
  @IsEnum(['TODO', 'QUOTE_RECEIVED', 'IN_PROGRESS', 'DONE'])
  status?: RepairStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contractorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contractorPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalCost?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}