import { IsString, MaxLength, MinLength } from 'class-validator';

/** Mot de passe provisoire défini par l’admin plateforme pour un user d’organisation. */
export class ResetOrganizationUserPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Mot de passe provisoire : au moins 8 caractères.' })
  @MaxLength(128)
  password!: string;
}
