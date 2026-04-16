import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('worksheet.pdf')
  async worksheetPdf(@CurrentUser() user: JwtAuthUser, @Res() res: Response) {
    const buf = await this.dashboard.buildWorksheetPdf(user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="immopilot-feuille-route-encaissements.pdf"');
    res.send(buf);
  }

  @Get()
  overview(@CurrentUser() user: JwtAuthUser) {
    return this.dashboard.overview(user.organizationId);
  }
}
