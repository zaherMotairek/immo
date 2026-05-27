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
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
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
  list(@CurrentUser() user: JwtAuthUser) {
    return this.tenants.list(user.organizationId);
  }

  /** Téléchargement / affichage CNI ou passeport (PDF ou image), protégé par JWT. */
  @Get(':id/id-document')
  downloadIdDocument(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.tenants.getIdDocumentStream(id, user.organizationId);
  }

  @Get(':id/id-documents')
  listIdDocuments(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.tenants.listIdDocuments(id, user.organizationId);
  }

  @Get(':id/id-documents/:fileKey')
  downloadIdDocumentByKey(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @Param('fileKey') fileKey: string,
  ) {
    return this.tenants.getIdDocumentStreamByKey(id, user.organizationId, fileKey);
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
  uploadIdDocument(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant (formulaire : champ « file »).');
    return this.tenants.saveIdDocument(id, user.organizationId, file, user);
  }

  @Delete(':id/id-document')
  deleteIdDocument(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.tenants.removeIdDocument(id, user.organizationId, user);
  }

  @Delete(':id/id-documents/:fileKey')
  deleteIdDocumentByKey(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @Param('fileKey') fileKey: string,
  ) {
    return this.tenants.removeIdDocumentByKey(id, user.organizationId, fileKey, user);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.tenants.get(id, user.organizationId);
  }

  @Post()
  create(@CurrentUser() user: JwtAuthUser, @Body() dto: CreateTenantDto) {
    return this.tenants.create(dto, user.organizationId);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, user.organizationId, dto, user);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.tenants.remove(id, user.organizationId);
  }
}
