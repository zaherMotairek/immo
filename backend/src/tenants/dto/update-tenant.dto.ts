import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEmail, IsOptional, ValidateIf } from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto';

/** Permet `email: null` pour effacer l’adresse ; chaîne vide traitée côté service. */
export class UpdateTenantDto extends PartialType(OmitType(CreateTenantDto, ['email'] as const)) {
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsEmail()
  email?: string | null;
}
