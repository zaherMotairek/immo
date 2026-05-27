import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCollectorDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  notes?: string | null;
}
