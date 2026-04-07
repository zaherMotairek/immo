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
import { UnitKind } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

const UNIT_KIND_SET = new Set<string>(Object.values(UnitKind));

@Controller('buildings')
@UseGuards(JwtAuthGuard)
export class BuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Get()
  list(@Query('unitKind') unitKindRaw?: string) {
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
    return this.buildings.list(unitKind);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.buildings.get(id);
  }

  @Post()
  create(@Body() dto: CreateBuildingDto) {
    return this.buildings.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBuildingDto) {
    return this.buildings.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.buildings.remove(id);
  }
}
