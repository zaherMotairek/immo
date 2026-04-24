import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

/** Mise à jour accès plateforme (paiement mensuel / suspension). */
export class UpdateOrganizationBillingDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined) return undefined;
    if (value === null) return null;
    return value;
  })
  @IsDateString({}, { message: 'Date « payé jusqu’au » invalide (format AAAA-MM-JJ).' })
  /** Dernier jour d’accès inclus ; null pour retirer le blocage par date. */
  platformAccessPaidUntil?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  platformAccessSuspended?: boolean;
}
