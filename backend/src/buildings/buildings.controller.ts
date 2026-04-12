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
  UseGuards,
} from '@nestjs/common';
import { BuildingStructureKind, UnitKind } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

const UNIT_KIND_SET = new Set<string>(Object.values(UnitKind));
const STRUCTURE_KIND_SET = new Set<string>(Object.values(BuildingStructureKind));

@Controller('buildings')
@UseGuards(JwtAuthGuard)
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

  @Get(':id')
  get(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.buildings.get(id, user.organizationId);
  }

  @Post()
  create(@CurrentUser() user: JwtAuthUser, @Body() dto: CreateBuildingDto) {
    return this.buildings.create(dto, user.organizationId);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdateBuildingDto) {
    return this.buildings.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.buildings.remove(id, user.organizationId);
  }
}
