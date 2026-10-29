import { IsEmail, IsObject, IsString, MinLength } from 'class-validator';

export class WebAuthnLoginOptionsDto {
  @IsEmail()
  @MinLength(3)
  email!: string;
}

export class WebAuthnLoginVerifyDto {
  @IsEmail()
  email!: string;

  @IsObject()
  response!: Record<string, unknown>;
}
