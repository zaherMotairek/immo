import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordTokenDto {
  @IsString()
  @MinLength(32, { message: 'Lien invalide.' })
  @MaxLength(128)
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
  @MaxLength(128)
  newPassword!: string;
}
