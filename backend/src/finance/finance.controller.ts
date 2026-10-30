import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { FinanceSummaryService } from './finance-summary.service';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceSummaryService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: JwtAuthUser,
    @Query('year') yearRaw?: string,
    @Query('month') monthRaw?: string,
  ) {
    let year: number | undefined;
    let month: number | undefined;
    if (yearRaw?.trim()) {
      const y = Number(yearRaw);
      if (Number.isInteger(y) && y >= 1990 && y <= 2100) year = y;
    }
    if (monthRaw?.trim()) {
      const m = Number(monthRaw);
      if (Number.isInteger(m) && m >= 1 && m <= 12) month = m;
    }
    return this.finance.getMonthSnapshot(user.organizationId, year, month);
  }

  @Get('today')
  today(
    @CurrentUser() user: JwtAuthUser,
    @Query('lateDays') lateRaw?: string,
    @Query('leaseEndingDays') endRaw?: string,
  ) {
    let lateDaysThreshold: number | undefined;
    let leaseEndingDays: number | undefined;
    if (lateRaw?.trim()) {
      const n = Number(lateRaw);
      if (Number.isInteger(n) && n >= 1 && n <= 90) lateDaysThreshold = n;
    }
    if (endRaw?.trim()) {
      const n = Number(endRaw);
      if (Number.isInteger(n) && n >= 7 && n <= 365) leaseEndingDays = n;
    }
    return this.finance.getTodayAgenda(user.organizationId, { lateDaysThreshold, leaseEndingDays });
  }
}
