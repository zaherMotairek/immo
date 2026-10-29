import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class WebAuthnRegisterVerifyDto {
  @IsObject()
  response!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  friendlyName?: string;
}
