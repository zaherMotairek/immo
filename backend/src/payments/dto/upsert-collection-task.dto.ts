import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export const COLLECTION_TASK_STATUSES = [
  'NONE',
  'ASSIGNED',
  'IN_PROGRESS',
  'COLLECTED_REPORTED',
  'CLOSED_PAID',
] as const;

export type CollectionTaskStatus = (typeof COLLECTION_TASK_STATUSES)[number];

export class UpsertCollectionTaskDto {
  @ValidateIf((_, v) => v != null)
  @IsString()
  collectorId?: string | null;

  @IsOptional()
  @IsIn(COLLECTION_TASK_STATUSES)
  status?: CollectionTaskStatus;

  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsBoolean()
  notifyCollector?: boolean;
}
