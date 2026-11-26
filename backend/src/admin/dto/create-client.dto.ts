import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Création d’une organisation + premier utilisateur (client). */
export class CreateClientDto {
  @IsString()
  @MinLength(1, { message: 'Indiquez le nom du bailleur / société affiché sur les reçus.' })
  @MaxLength(200)
  organizationName!: string;

  @IsEmail({}, { message: 'E-mail du client invalide.' })
  @IsString()
  @MaxLength(320)
  email!: string;

  /** Optionnel (D3) : si absent, mot de passe aléatoire + lien de réinit. */
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Mot de passe provisoire : au moins 8 caractères.' })
  @MaxLength(128)
  password?: string;

  /** Nom du contact (optionnel). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ownerName?: string;
}
