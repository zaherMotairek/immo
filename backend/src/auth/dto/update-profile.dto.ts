import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  /** Nom affiché pour le compte (optionnel). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  userName?: string;

  /** Nom du bailleur / émetteur — utilisé sur les quittances PDF (Organization.name). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationName?: string;
}
