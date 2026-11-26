import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import type { InspectionKind } from '@prisma/client';

export class CreateLeaseInspectionDto {
  @IsEnum(['MOVE_IN', 'MOVE_OUT'])
  kind!: InspectionKind;

  @IsOptional()
  @IsUUID()
  templateId?: string;
}