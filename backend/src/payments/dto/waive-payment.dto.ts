import { IsString, MaxLength, MinLength } from 'class-validator';

export class WaivePaymentDto {
  @IsString()
  @MinLength(3, { message: 'Le motif doit contenir au moins 3 caractères.' })
  @MaxLength(2000)
  reason!: string;
}
