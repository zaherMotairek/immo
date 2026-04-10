import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** Payer d’un coup les N prochaines échéances de loyer encore impayées (1 à 12 mois, ex. 6 mois d’avance). */
export class PrepayMonthsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  months!: number;
}
