import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ReviseLeaseDto {
  /** Nouveau loyer FCFA (prioritaire sur percent si les deux). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  newMonthlyRent?: number;

  /** Variation en % (ex. 5 = +5 %). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-50)
  @Max(200)
  percent?: number;

  @IsDateString()
  effectiveFrom!: string;

  /** Prolongation optionnelle de la date de fin. */
  @IsOptional()
  @IsDateString()
  newEndDate?: string;

  @IsOptional()
  @IsBoolean()
  renew?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
