import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { UnitKind } from '@prisma/client';

export class TemplateItemDto {
  @IsString()
  @MaxLength(120)
  room!: string;

  @IsString()
  @MaxLength(200)
  element!: string;

  @IsOptional()
  sortOrder?: number;
}

export class UpsertInspectionTemplateDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsEnum([
    'APARTMENT',
    'HOUSE',
    'LAND',
    'OFFICE',
    'WAREHOUSE',
    'COMMERCIAL',
    'GARAGE',
    'OTHER',
  ])
  unitKind?: UnitKind;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto)
  items!: TemplateItemDto[];
}