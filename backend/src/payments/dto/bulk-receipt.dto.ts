import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** Reçu PDF unique pour plusieurs échéances déjà payées (même bail). */
export class BulkReceiptDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(24)
  @IsUUID('4', { each: true })
  paymentIds!: string[];
}
