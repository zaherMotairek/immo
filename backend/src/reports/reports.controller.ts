import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ExcelImportService } from './excel-import.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly excelImport: ExcelImportService,
  ) {}

  @Get('summary.pdf')
  async pdf(@CurrentUser() user: JwtAuthUser, @Query('year') year: string | undefined, @Res() res: Response) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const buf = await this.reports.buildPdf(Number.isFinite(y) ? y : new Date().getFullYear(), user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="immopilot-rapport-${y}.pdf"`);
    res.send(buf);
  }

  @Get('table-baux.pdf')
  async tableBaux(@CurrentUser() user: JwtAuthUser, @Res() res: Response) {
    const buf = await this.reports.buildLeasesTablePdf(user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="immopilot-liste-baux.pdf"');
    res.send(buf);
  }

  @Get('table-locataires.pdf')
  async tableLocataires(@CurrentUser() user: JwtAuthUser, @Res() res: Response) {
    const buf = await this.reports.buildTenantsTablePdf(user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="immopilot-liste-locataires.pdf"');
    res.send(buf);
  }

  @Get('table-biens.pdf')
  async tableBiens(@CurrentUser() user: JwtAuthUser, @Res() res: Response) {
    const buf = await this.reports.buildBuildingsTablePdf(user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="immopilot-liste-biens.pdf"');
    res.send(buf);
  }

  @Get('table-locations.pdf')
  async tableLocations(
    @CurrentUser() user: JwtAuthUser,
    @Query('all') all: string | undefined,
    @Res() res: Response,
  ) {
    const activeOnly = !(all === '1' || all === 'true');
    const buf = await this.reports.buildLocationsTablePdf(user.organizationId, activeOnly);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="immopilot-liste-locations.pdf"');
    res.send(buf);
  }

  @Get('summary.xlsx')
  async xlsx(@CurrentUser() user: JwtAuthUser, @Query('year') year: string | undefined, @Res() res: Response) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const buf = await this.reports.buildExcel(Number.isFinite(y) ? y : new Date().getFullYear(), user.organizationId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="immopilot-rapport-${y}.xlsx"`);
    res.send(buf);
  }

  @Post('import.xlsx')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async importXlsx(@CurrentUser() user: JwtAuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      return { ok: false, message: 'Aucun fichier reçu (attendu : fichier .xlsx, champ « file »).' };
    }
    const result = await this.excelImport.importFromBuffer(file.buffer, user.organizationId);
    return { ok: true, ...result };
  }
}
