import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteOrganizationUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;
}
