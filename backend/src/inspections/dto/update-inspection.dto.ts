import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { DepositRefundDecision, InspectionItemCondition } from '@prisma/client';

export class UpdateInspectionItemDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsEnum(['GOOD', 'WORN', 'DAMAGED', 'UNCHECKED'])
  condition?: InspectionItemCondition;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateLeaseInspectionDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInspectionItemDto)
  items?: UpdateInspectionItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tenantSignatureName?: string;

  @IsOptional()
  sign?: boolean;

  @IsOptional()
  @IsEnum(['PENDING', 'FULL', 'PARTIAL', 'WITHHOLD'])
  depositRefundDecision?: DepositRefundDecision;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  depositRefundNote?: string;
}