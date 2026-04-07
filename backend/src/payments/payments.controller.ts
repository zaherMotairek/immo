import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(
    @Query('overdue') overdue?: string,
    @Query('leaseId') leaseId?: string,
    /** Filtre optionnel par année de période (loyer facturé pour cette année). */
    @Query('year') yearRaw?: string,
    /** Filtre optionnel par mois de période (1–12). */
    @Query('month') monthRaw?: string,
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
    return this.payments.list({ overdueOnly, leaseId, periodYear, periodMonth });
  }

  @Post(':id/send-reminder')
  sendReminder(@Param('id') id: string) {
    return this.payments.sendOverdueReminder(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.payments.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.payments.update(id, dto);
  }
}
