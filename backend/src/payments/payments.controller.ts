import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { BulkReceiptDto } from './dto/bulk-receipt.dto';
import { WaivePaymentDto } from './dto/waive-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtAuthUser,
    @Query('overdue') overdue?: string,
    @Query('leaseId') leaseId?: string,
    /** Filtre optionnel par année de période (loyer facturé pour cette année). */
    @Query('year') yearRaw?: string,
    /** Filtre optionnel par mois de période (1–12). */
    @Query('month') monthRaw?: string,
    @Query('buildingId') buildingId?: string,
    @Query('unitId') unitId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const overdueOnly = overdue === '1' || overdue === 'true';
    let periodYear: number | undefined;
    if (yearRaw !== undefined && yearRaw.trim() !== '') {
      const y = Number(yearRaw);
      if (Number.isInteger(y) && y >= 1990 && y <= 2100) periodYear = y;
    }
    let periodMonth: number | undefined;
    if (monthRaw !== undefined && monthRaw.trim() !== '') {
      const m = Number(monthRaw);
      if (Number.isInteger(m) && m >= 1 && m <= 12) periodMonth = m;
    }
    return this.payments.list(user.organizationId, {
      overdueOnly,
      leaseId,
      periodYear,
      periodMonth,
      buildingId,
      unitId,
      tenantId,
    });
  }

  /** Feuille de route imprimable : cases « perçu », colonne notes — mêmes filtres que la liste. */
  @Get('worksheet.pdf')
  async worksheetPdf(
    @CurrentUser() user: JwtAuthUser,
    @Res() res: Response,
    @Query('overdue') overdue?: string,
    @Query('leaseId') leaseId?: string,
    @Query('year') yearRaw?: string,
    @Query('month') monthRaw?: string,
    @Query('buildingId') buildingId?: string,
    @Query('unitId') unitId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const overdueOnly = overdue === '1' || overdue === 'true';
    let periodYear: number | undefined;
    if (yearRaw !== undefined && yearRaw.trim() !== '') {
      const y = Number(yearRaw);
      if (Number.isInteger(y) && y >= 1990 && y <= 2100) periodYear = y;
    }
    let periodMonth: number | undefined;
    if (monthRaw !== undefined && monthRaw.trim() !== '') {
      const m = Number(monthRaw);
      if (Number.isInteger(m) && m >= 1 && m <= 12) periodMonth = m;
    }
    const buf = await this.payments.buildWorksheetPdf(user.organizationId, {
      overdueOnly,
      leaseId,
      periodYear,
      periodMonth,
      buildingId,
      unitId,
      tenantId,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="immopilot-feuille-route-paiements.pdf"');
    res.send(buf);
  }

  @Post(':id/send-reminder')
  sendReminder(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.payments.sendOverdueReminder(id, user.organizationId);
  }

  /** Gratuité de loyer (geste commercial) : motif obligatoire, pas d’encaissement. */
  @Post(':id/waive')
  waive(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: WaivePaymentDto) {
    return this.payments.waiveRent(id, user.organizationId, dto.reason);
  }

  /** Reçu PDF pour une échéance déjà marquée payée (impression / archivage). */
  @Get(':id/receipt')
  async receipt(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Res() res: Response) {
    const buf = await this.payments.buildReceiptPdf([id], user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recu-loyer-${id.slice(0, 8)}.pdf"`);
    res.send(buf);
  }

  /** Reçu PDF unique pour plusieurs loyers payés (même bail), ex. après prépaiement de plusieurs mois. */
  @Post('receipts/bulk')
  async bulkReceipt(@CurrentUser() user: JwtAuthUser, @Body() dto: BulkReceiptDto, @Res() res: Response) {
    const buf = await this.payments.buildReceiptPdf(dto.paymentIds, user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recu-loyers-${Date.now()}.pdf"`);
    res.send(buf);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.payments.get(id, user.organizationId);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.payments.update(id, user.organizationId, dto);
  }
}
