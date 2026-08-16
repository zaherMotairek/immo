import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteOrganizationUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  /** Mot de passe provisoire (sinon généré et renvoyé à l’admin). */
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Mot de passe provisoire : au moins 8 caractères.' })
  @MaxLength(128)
  password?: string;
}
