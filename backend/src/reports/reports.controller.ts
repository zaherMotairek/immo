import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary.pdf')
  async pdf(@Query('year') year: string | undefined, @Res() res: Response) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const buf = await this.reports.buildPdf(Number.isFinite(y) ? y : new Date().getFullYear());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="immopilot-rapport-${y}.pdf"`);
    res.send(buf);
  }

  @Get('summary.xlsx')
  async xlsx(@Query('year') year: string | undefined, @Res() res: Response) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const buf = await this.reports.buildExcel(Number.isFinite(y) ? y : new Date().getFullYear());
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="immopilot-rapport-${y}.xlsx"`);
    res.send(buf);
  }
}
