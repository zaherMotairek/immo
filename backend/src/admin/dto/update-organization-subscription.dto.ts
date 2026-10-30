import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateOrganizationSubscriptionDto {
  @IsOptional()
  @IsIn(['FREE', 'TRIAL', 'PRO'])
  planCode?: string;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string | null;

  @IsOptional()
  @IsDateString()
  subscriptionEndsAt?: string | null;

  /** Alias historique : miroir platformAccessPaidUntil. */
  @IsOptional()
  @IsDateString()
  platformAccessPaidUntil?: string | null;

  @IsOptional()
  @IsBoolean()
  platformAccessSuspended?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalNotes?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  extendMonths?: number;
}
