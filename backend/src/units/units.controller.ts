import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgPermGuard } from '../auth/org-perm.guard';
import { RequireOrgPerm } from '../auth/require-org-perm.decorator';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller()
@UseGuards(JwtAuthGuard, OrgPermGuard)
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  @Get('buildings/:buildingId/units')
  list(@CurrentUser() user: JwtAuthUser, @Param('buildingId') buildingId: string) {
    return this.units.listByBuilding(buildingId, user.organizationId);
  }

  @Post('buildings/:buildingId/units')
  @RequireOrgPerm('buildings:write')
  create(@CurrentUser() user: JwtAuthUser, @Param('buildingId') buildingId: string, @Body() dto: CreateUnitDto) {
    return this.units.create(buildingId, dto, user.organizationId);
  }

  @Patch('units/:id')
  @RequireOrgPerm('buildings:write')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.units.update(id, user.organizationId, dto);
  }

  @Delete('units/:id')
  @RequireOrgPerm('buildings:write')
  remove(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.units.remove(id, user.organizationId);
  }
}
