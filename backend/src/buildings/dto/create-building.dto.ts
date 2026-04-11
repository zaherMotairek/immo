import { BuildingStructureKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Aligné sur Prisma ; liste explicite pour la validation (évite un client `prisma generate` pas à jour). */
export const BUILDING_STRUCTURE_KIND_INPUT = ['IMMEUBLE', 'TERRAIN_LOTS', 'MONO_LOT'] as const;

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

  /** IMMEUBLE / TERRAIN_LOTS = plusieurs unités et baux sur le même bien. MONO_LOT = un seul lot (villa, parcelle unique, etc.). */
  @IsOptional()
  @IsIn(BUILDING_STRUCTURE_KIND_INPUT)
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

  /** Pour un terrain multi-lots : nombre de lots prévus (indicatif). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50_000)
  terrainLotCount?: number;
}
