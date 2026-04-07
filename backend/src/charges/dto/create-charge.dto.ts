import { ChargeCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateChargeDto {
  @IsUUID()
  buildingId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsEnum(ChargeCategory)
  category!: ChargeCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @Type(() => Number)
  @Min(0)
  amount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
