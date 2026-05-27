import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';

@Controller('public/payments')
export class PaymentsPublicController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('receipts/:token')
  async sharedReceipt(@Param('token') token: string, @Res() res: Response) {
    const out = await this.payments.buildReceiptPdfFromShareToken(token);
    if (!out) throw new NotFoundException('Lien de reçu invalide ou expiré.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recu-loyer-${Date.now()}.pdf"`);
    res.send(out);
  }
}
