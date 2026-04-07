import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateLeaseDto {
  @IsUUID()
  unitId!: string;

  @IsUUID()
  tenantId!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRent!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  rentDueDay?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
