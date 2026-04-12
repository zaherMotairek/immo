import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  @Get('buildings/:buildingId/units')
  list(@CurrentUser() user: JwtAuthUser, @Param('buildingId') buildingId: string) {
    return this.units.listByBuilding(buildingId, user.organizationId);
  }

  @Post('buildings/:buildingId/units')
  create(@CurrentUser() user: JwtAuthUser, @Param('buildingId') buildingId: string, @Body() dto: CreateUnitDto) {
    return this.units.create(buildingId, dto, user.organizationId);
  }

  @Patch('units/:id')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.units.update(id, user.organizationId, dto);
  }

  @Delete('units/:id')
  remove(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.units.remove(id, user.organizationId);
  }
}
