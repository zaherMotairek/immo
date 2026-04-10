import { BuildingStructureKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  commune!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /** Immeuble = plusieurs unités / baux possibles. MONO_LOT = un seul lot (villa, entrepôt entier, etc.). */
  @IsOptional()
  @IsEnum(BuildingStructureKind)
  structureKind?: BuildingStructureKind;

  /** Pour un immeuble : nombre d’étages (R+13 → 13 ou 14 selon votre usage, optionnel). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  floorCount?: number;

  /** Pour un immeuble : nombre d’appartements / lots résidentiels prévus (indicatif). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50_000)
  apartmentCount?: number;
}
