import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCollectorDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  notes?: string;
}
