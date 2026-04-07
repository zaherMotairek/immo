import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  @Get('buildings/:buildingId/units')
  list(@Param('buildingId') buildingId: string) {
    return this.units.listByBuilding(buildingId);
  }

  @Post('buildings/:buildingId/units')
  create(@Param('buildingId') buildingId: string, @Body() dto: CreateUnitDto) {
    return this.units.create(buildingId, dto);
  }

  @Patch('units/:id')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.units.update(id, dto);
  }

  @Delete('units/:id')
  remove(@Param('id') id: string) {
    return this.units.remove(id);
  }
}
