import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { GeneratePaymentsDto } from './dto/generate-payments.dto';
import { PrepayMonthsDto } from './dto/prepay-months.dto';
import { LEASE_CONTRACT_ALLOWED_MIMES, LEASE_CONTRACT_MAX_BYTES } from './lease-contract.constants';

@Controller('leases')
@UseGuards(JwtAuthGuard)
export class LeasesController {
  constructor(private readonly leases: LeasesService) {}

  @Get('overview')
  overview(@CurrentUser() user: JwtAuthUser, @Query('all') all?: string) {
    const activeOnly = !(all === '1' || all === 'true');
    return this.leases.listOverview(user.organizationId, activeOnly);
  }

  @Get('deposits-collected')
  depositsCollected(@CurrentUser() user: JwtAuthUser) {
    return this.leases.listDepositsCollected(user.organizationId);
  }

  @Get()
  list(@CurrentUser() user: JwtAuthUser) {
    return this.leases.list(user.organizationId);
  }

  /** PDF fiche location (détail bail) — doit rester avant les routes « :id » ambiguës. */
  @Get(':id/fiche.pdf')
  async fichePdf(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Res() res: Response) {
    const buf = await this.leases.buildFichePdf(id, user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="fiche-location.pdf"');
    res.send(buf);
  }

  @Get(':id/fiche')
  fiche(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.leases.getFiche(id, user.organizationId);
  }

  /** Téléchargement / affichage du contrat (PDF ou image), protégé par JWT. */
  @Get(':id/contract')
  downloadContract(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.leases.getContractStream(id, user.organizationId);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.leases.get(id, user.organizationId);
  }

  @Post()
  create(@CurrentUser() user: JwtAuthUser, @Body() dto: CreateLeaseDto) {
    return this.leases.create(dto, user.organizationId);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdateLeaseDto) {
    return this.leases.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.leases.remove(id, user.organizationId);
  }

  @Post(':id/contract')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: LEASE_CONTRACT_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!LEASE_CONTRACT_ALLOWED_MIMES.has(file.mimetype)) {
          cb(new BadRequestException('Format non accepté (PDF, JPEG, PNG, WebP).'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadContract(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant (formulaire : champ « file »).');
    return this.leases.saveContract(id, user.organizationId, file);
  }

  @Delete(':id/contract')
  deleteContractFile(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.leases.removeContract(id, user.organizationId);
  }

  @Post(':id/generate-payments')
  generatePayments(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: GeneratePaymentsDto) {
    return this.leases.generatePayments(id, user.organizationId, dto.year);
  }

  /** Marque comme payées les N prochaines échéances de loyer encore PENDING/LATE (1 à 12). */
  @Post(':id/prepay-months')
  prepayMonths(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: PrepayMonthsDto) {
    return this.leases.prepayNextMonths(id, user.organizationId, dto.months);
  }
}
