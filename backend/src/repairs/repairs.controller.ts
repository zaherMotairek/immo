import {
  BadRequestException,
  Body,
  Controller,
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
import { RepairsService } from './repairs.service';
import { CreateRepairDto } from './dto/create-repair.dto';
import { UpdateRepairDto } from './dto/update-repair.dto';
import { REPAIR_PHOTO_ALLOWED_MIMES, REPAIR_PHOTO_MAX_BYTES } from './repair-photo.constants';

@Controller('repairs')
@UseGuards(JwtAuthGuard, OrgPermGuard)
export class RepairsController {
  constructor(private readonly repairs: RepairsService) {}

  @Get()
  @RequireOrgPerm('buildings:read')
  list(@CurrentUser() user: JwtAuthUser, @Query('status') status?: string) {
    return this.repairs.list(user.organizationId, status);
  }

  @Get('overdue-reminders')
  @RequireOrgPerm('charges:read')
  overdue(@CurrentUser() user: JwtAuthUser) {
    return this.repairs.overdueReminders(user.organizationId);
  }

  @Post()
  @RequireOrgPerm('charges:write')
  create(@CurrentUser() user: JwtAuthUser, @Body() dto: CreateRepairDto) {
    return this.repairs.create(user.organizationId, dto);
  }

  @Get(':id')
  @RequireOrgPerm('buildings:read')
  get(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.repairs.get(id, user.organizationId);
  }

  @Patch(':id')
  @RequireOrgPerm('charges:write')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdateRepairDto) {
    return this.repairs.update(id, user.organizationId, dto);
  }

  @Post(':id/maintenance-charge')
  @RequireOrgPerm('charges:write')
  linkCharge(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.repairs.createMaintenanceCharge(id, user.organizationId);
  }

  @Post(':id/photos')
  @RequireOrgPerm('charges:write')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: REPAIR_PHOTO_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!REPAIR_PHOTO_ALLOWED_MIMES.has(file.mimetype)) {
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
    @Query('caption') caption?: string,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant (champ « file »).');
    return this.repairs.addPhoto(user.organizationId, id, file, caption);
  }

  @Get(':id/photos/:photoId')
  @RequireOrgPerm('buildings:read')
  photo(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Res() res: Response,
  ) {
    return this.repairs.streamPhoto(user.organizationId, id, photoId, res);
  }
}