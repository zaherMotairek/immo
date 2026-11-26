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
import { OrgPermGuard } from '../auth/org-perm.guard';
import { RequireOrgPerm } from '../auth/require-org-perm.decorator';
import { InspectionsService } from './inspections.service';
import { CreateLeaseInspectionDto } from './dto/create-inspection.dto';
import { UpdateLeaseInspectionDto } from './dto/update-inspection.dto';
import { UpsertInspectionTemplateDto } from './dto/upsert-template.dto';
import {
  INSPECTION_PHOTO_ALLOWED_MIMES,
  INSPECTION_PHOTO_MAX_BYTES,
} from './inspection-photo.constants';

@Controller()
@UseGuards(JwtAuthGuard, OrgPermGuard)
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Get('inspections/templates')
  @RequireOrgPerm('leases:read')
  listTemplates(@CurrentUser() user: JwtAuthUser) {
    return this.inspections.listTemplates(user.organizationId);
  }

  @Post('inspections/templates')
  @RequireOrgPerm('leases:write')
  createTemplate(@CurrentUser() user: JwtAuthUser, @Body() dto: UpsertInspectionTemplateDto) {
    return this.inspections.createTemplate(user.organizationId, dto);
  }

  @Patch('inspections/templates/:id')
  @RequireOrgPerm('leases:write')
  updateTemplate(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertInspectionTemplateDto,
  ) {
    return this.inspections.updateTemplate(user.organizationId, id, dto);
  }

  @Delete('inspections/templates/:id')
  @RequireOrgPerm('leases:write')
  deleteTemplate(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.inspections.deleteTemplate(user.organizationId, id);
  }

  @Get('leases/:leaseId/inspections')
  @RequireOrgPerm('leases:read')
  listForLease(@CurrentUser() user: JwtAuthUser, @Param('leaseId') leaseId: string) {
    return this.inspections.listForLease(user.organizationId, leaseId);
  }

  @Post('leases/:leaseId/inspections')
  @RequireOrgPerm('leases:write')
  createForLease(
    @CurrentUser() user: JwtAuthUser,
    @Param('leaseId') leaseId: string,
    @Body() dto: CreateLeaseInspectionDto,
  ) {
    return this.inspections.createForLease(user.organizationId, leaseId, dto);
  }

  @Get('inspections/:id')
  @RequireOrgPerm('leases:read')
  getOne(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.inspections.getOne(user.organizationId, id);
  }

  @Patch('inspections/:id')
  @RequireOrgPerm('leases:write')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdateLeaseInspectionDto) {
    return this.inspections.update(user.organizationId, id, dto);
  }

  @Get('inspections/:id/compare')
  @RequireOrgPerm('leases:read')
  compare(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.inspections.compareWithMoveIn(user.organizationId, id);
  }

  @Get('inspections/:id/pdf')
  @RequireOrgPerm('leases:read')
  pdf(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.inspections.renderPdf(user.organizationId, id);
  }

  @Post('inspections/:id/photos')
  @RequireOrgPerm('leases:write')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: INSPECTION_PHOTO_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!INSPECTION_PHOTO_ALLOWED_MIMES.has(file.mimetype)) {
          cb(new BadRequestException('Format non accepté (JPEG, PNG, WebP).'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('itemId') itemId?: string,
    @Query('caption') caption?: string,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant (champ « file »).');
    return this.inspections.addPhoto(user.organizationId, id, file, itemId, caption);
  }

  @Get('inspections/:id/photos/:photoId')
  @RequireOrgPerm('leases:read')
  photo(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Res() res: Response,
  ) {
    return this.inspections.streamPhoto(user.organizationId, id, photoId, res);
  }
}