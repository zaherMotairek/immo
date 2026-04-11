import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CHARGE_CATEGORY_VALUES, type ChargeCategoryValue } from '../charge-categories';

export class CreateChargeDto {
  @IsUUID()
  buildingId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsIn([...CHARGE_CATEGORY_VALUES], {
    message: `Catégorie invalide. Valeurs acceptées : ${CHARGE_CATEGORY_VALUES.join(', ')}`,
  })
  category!: ChargeCategoryValue;

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
