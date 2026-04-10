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

  /** Si 1, 2 ou 3 : caution = loyer mensuel × ce nombre (prioritaire sur depositAmount). 0 ou absent = pas de calcul auto. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3)
  depositMonths?: number;

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
