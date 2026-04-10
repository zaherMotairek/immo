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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
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
  overview(@Query('all') all?: string) {
    const activeOnly = !(all === '1' || all === 'true');
    return this.leases.listOverview(activeOnly);
  }

  @Get('deposits-collected')
  depositsCollected() {
    return this.leases.listDepositsCollected();
  }

  @Get()
  list() {
    return this.leases.list();
  }

  @Get(':id/fiche')
  fiche(@Param('id') id: string) {
    return this.leases.getFiche(id);
  }

  /** Téléchargement / affichage du contrat (PDF ou image), protégé par JWT. */
  @Get(':id/contract')
  downloadContract(@Param('id') id: string) {
    return this.leases.getContractStream(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.leases.get(id);
  }

  @Post()
  create(@Body() dto: CreateLeaseDto) {
    return this.leases.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeaseDto) {
    return this.leases.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leases.remove(id);
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
  uploadContract(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant (formulaire : champ « file »).');
    return this.leases.saveContract(id, file);
  }

  @Delete(':id/contract')
  deleteContractFile(@Param('id') id: string) {
    return this.leases.removeContract(id);
  }

  @Post(':id/generate-payments')
  generatePayments(@Param('id') id: string, @Body() dto: GeneratePaymentsDto) {
    return this.leases.generatePayments(id, dto.year);
  }

  /** Marque comme payées les N prochaines échéances de loyer encore PENDING/LATE (1 à 12). */
  @Post(':id/prepay-months')
  prepayMonths(@Param('id') id: string, @Body() dto: PrepayMonthsDto) {
    return this.leases.prepayNextMonths(id, dto.months);
  }
}
