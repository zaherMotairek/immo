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
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { BuildingStructureKind, UnitKind } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgPermGuard } from '../auth/org-perm.guard';
import { RequireOrgPerm } from '../auth/require-org-perm.decorator';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

const UNIT_KIND_SET = new Set<string>(Object.values(UnitKind));
const STRUCTURE_KIND_SET = new Set<string>(Object.values(BuildingStructureKind));

@Controller('buildings')
@UseGuards(JwtAuthGuard, OrgPermGuard)
export class BuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtAuthUser,
    @Query('unitKind') unitKindRaw?: string,
    @Query('structureKind') structureKindRaw?: string,
  ) {
    let unitKind: UnitKind | undefined;
    if (unitKindRaw != null && String(unitKindRaw).trim() !== '') {
      const k = String(unitKindRaw).trim().toUpperCase();
      if (!UNIT_KIND_SET.has(k)) {
        throw new BadRequestException(
          `Paramètre unitKind inconnu : ${unitKindRaw}. Valeurs : ${[...UNIT_KIND_SET].sort().join(', ')}.`,
        );
      }
      unitKind = k as UnitKind;
    }
    let structureKind: BuildingStructureKind | undefined;
    if (structureKindRaw != null && String(structureKindRaw).trim() !== '') {
      const sk = String(structureKindRaw).trim().toUpperCase();
      if (!STRUCTURE_KIND_SET.has(sk)) {
        throw new BadRequestException(
          `Paramètre structureKind inconnu : ${structureKindRaw}. Valeurs : ${[...STRUCTURE_KIND_SET].sort().join(', ')}.`,
        );
      }
      structureKind = sk as BuildingStructureKind;
    }
    return this.buildings.list(user.organizationId, unitKind, structureKind);
  }

  /** Feuille de route imprimable : cases « fait », colonne notes — mêmes filtres que la liste (+ q = recherche). */
  @Get('worksheet.pdf')
  async worksheetPdf(
    @CurrentUser() user: JwtAuthUser,
    @Res() res: Response,
    @Query('unitKind') unitKindRaw?: string,
    @Query('structureKind') structureKindRaw?: string,
    @Query('q') q?: string,
  ) {
    let unitKind: UnitKind | undefined;
    if (unitKindRaw != null && String(unitKindRaw).trim() !== '') {
      const k = String(unitKindRaw).trim().toUpperCase();
      if (!UNIT_KIND_SET.has(k)) {
        throw new BadRequestException(
          `Paramètre unitKind inconnu : ${unitKindRaw}. Valeurs : ${[...UNIT_KIND_SET].sort().join(', ')}.`,
        );
      }
      unitKind = k as UnitKind;
    }
    let structureKind: BuildingStructureKind | undefined;
    if (structureKindRaw != null && String(structureKindRaw).trim() !== '') {
      const sk = String(structureKindRaw).trim().toUpperCase();
      if (!STRUCTURE_KIND_SET.has(sk)) {
        throw new BadRequestException(
          `Paramètre structureKind inconnu : ${structureKindRaw}. Valeurs : ${[...STRUCTURE_KIND_SET].sort().join(', ')}.`,
        );
      }
      structureKind = sk as BuildingStructureKind;
    }
    const buf = await this.buildings.buildWorksheetPdf(user.organizationId, { unitKind, structureKind, q });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="immopilot-feuille-route-biens.pdf"');
    res.send(buf);
  }

  /** Fiche PDF complète du bien : lieu, structure, unités et baux actifs. */
  @Get(':id/fiche.pdf')
  async buildingFichePdf(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buf = await this.buildings.buildBuildingFichePdf(id, user.organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="immopilot-fiche-bien-${id.slice(0, 8)}.pdf"`);
    res.send(buf);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.buildings.get(id, user.organizationId);
  }

  @Post()
  @RequireOrgPerm('buildings:write')
  create(@CurrentUser() user: JwtAuthUser, @Body() dto: CreateBuildingDto) {
    return this.buildings.create(dto, user.organizationId);
  }

  @Patch(':id')
  @RequireOrgPerm('buildings:write')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdateBuildingDto) {
    return this.buildings.update(id, user.organizationId, dto);
  }

  /** C8-B : génère les lots / appartements manquants selon la structure déclarée. */
  @Post(':id/generate-units')
  @RequireOrgPerm('buildings:write')
  generateUnits(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.buildings.generateMissingUnits(id, user.organizationId);
  }

  @Delete(':id')
  @RequireOrgPerm('buildings:write')
  remove(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.buildings.remove(id, user.organizationId);
  }
}
