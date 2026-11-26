import { IsBoolean, IsOptional, IsString, Equals } from 'class-validator';

export class ResetOrgDataDto {
  @IsOptional()
  @IsBoolean()
  payments?: boolean;

  @IsOptional()
  @IsBoolean()
  leases?: boolean;

  @IsOptional()
  @IsBoolean()
  tenants?: boolean;

  @IsOptional()
  @IsBoolean()
  buildings?: boolean;

  @IsOptional()
  @IsBoolean()
  charges?: boolean;

  @IsOptional()
  @IsBoolean()
  repairs?: boolean;

  @IsOptional()
  @IsBoolean()
  inspections?: boolean;

  @IsOptional()
  @IsBoolean()
  collectors?: boolean;

  /** Sécurité : l’utilisateur doit taper EFFACER. */
  @IsString()
  @Equals('EFFACER')
  confirmPhrase!: string;
}