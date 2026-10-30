import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Inscription self-serve (D5) — MDP fort. */
export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  organizationName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  ownerName!: string;

  /**
   * Au moins 10 car., 1 majuscule, 1 minuscule, 1 chiffre.
   */
  @IsString()
  @MinLength(10, { message: 'Mot de passe : au moins 10 caractères.' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Mot de passe : majuscule, minuscule et chiffre requis.',
  })
  password!: string;

  /** Case CGU / confidentialité (Phase E — obligatoire). */
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean()
  @Equals(true, { message: 'Acceptez les conditions d’utilisation.' })
  acceptTerms!: boolean;
}
