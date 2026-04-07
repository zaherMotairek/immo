import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  TENANT_ID_DOC_ALLOWED_MIMES,
  TENANT_ID_DOC_MAX_BYTES,
} from './tenant-id-doc.constants';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list() {
    return this.tenants.list();
  }

  /** Téléchargement / affichage CNI ou passeport (PDF ou image), protégé par JWT. */
  @Get(':id/id-document')
  downloadIdDocument(@Param('id') id: string) {
    return this.tenants.getIdDocumentStream(id);
  }

  @Post(':id/id-document')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: TENANT_ID_DOC_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!TENANT_ID_DOC_ALLOWED_MIMES.has(file.mimetype)) {
          cb(new BadRequestException('Format non accepté (PDF, JPEG, PNG, WebP).'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadIdDocument(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant (formulaire : champ « file »).');
    return this.tenants.saveIdDocument(id, file);
  }

  @Delete(':id/id-document')
  deleteIdDocument(@Param('id') id: string) {
    return this.tenants.removeIdDocument(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tenants.get(id);
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenants.remove(id);
  }
}
