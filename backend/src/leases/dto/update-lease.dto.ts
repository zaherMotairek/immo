import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsUUID, Max, Min, ValidateIf } from 'class-validator';

/** Champs optionnels ; `null` pour `endDate` / `depositAmount` efface la valeur en base. */
export class UpdateLeaseDto {
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRent?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositAmount?: number | null;

  /** Date d’encaissement de la caution, ou null pour réinitialiser. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  depositPaidAt?: string | null;

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
