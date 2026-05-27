import { IsString, MaxLength, ValidateIf } from 'class-validator';

/** `note: null` ou corps vide — sans ValidateIf, class-validator rejette `null` sur @IsString(). */
export class NotifyCollectorDto {
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
