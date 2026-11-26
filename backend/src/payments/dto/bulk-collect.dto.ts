import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CollectionMethod } from '@prisma/client';

export class BulkCollectItemDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsEnum(CollectionMethod)
  collectionMethod?: CollectionMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  collectionReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;
}

export class BulkCollectDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkCollectItemDto)
  items!: BulkCollectItemDto[];

  /** Valeurs communes si non précisées sur une ligne. */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsEnum(CollectionMethod)
  collectionMethod?: CollectionMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  collectionReference?: string;
}

export class ConfirmStatementMatchesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkCollectItemDto)
  items!: BulkCollectItemDto[];
}
