import { UnitKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsOptional()
  @IsEnum(UnitKind)
  kind?: UnitKind;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  /** Numéro de logement (immeuble) ou de lot (terrain) — pas pour entrepôt / commerce en immeuble. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500_000)
  apartmentSlot?: number;

  /** Numéro de local entrepôt / commerce (immeuble uniquement) — distinct du numéro de logement. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500_000)
  locauxSlot?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surfaceM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  rooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultRent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
