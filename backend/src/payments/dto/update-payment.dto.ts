import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  /**
   * Versement partiel (FCFA) : s’ajoute au déjà encaissé. Ne pas combiner avec `amountPaid` dans la même requête.
   * Quand le cumul atteint le montant dû, le statut passe automatiquement à PAYÉ.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  addAmountPaid?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
