import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RecordSubscriptionPaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountFcfa!: number;

  @IsIn(['WAVE', 'ORANGE', 'MTN', 'MOOV', 'CASH', 'BANK'])
  method!: 'WAVE' | 'ORANGE' | 'MTN' | 'MOOV' | 'CASH' | 'BANK';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsDateString()
  paidAt!: string;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  /** Forfait prépayé : 1, 3 ou 12 mois (12 = annuel + mois offert). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 3, 12])
  prepaidMonths?: 1 | 3 | 12;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Si true : aligne subscriptionEndsAt / platformAccessPaidUntil sur periodEnd. */
  @IsOptional()
  extendAccess?: boolean;

  /** Réservé provider en ligne (CinetPay / Wave…) — null = saisie manuelle. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerRef?: string;
}
