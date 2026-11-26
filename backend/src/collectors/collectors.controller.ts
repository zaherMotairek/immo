import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgPermGuard } from '../auth/org-perm.guard';
import { RequireOrgPerm } from '../auth/require-org-perm.decorator';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { UpdateCollectorDto } from './dto/update-collector.dto';

@Controller('collectors')
@UseGuards(JwtAuthGuard, OrgPermGuard)
export class CollectorsController {
  constructor(private readonly collectors: CollectorsService) {}

  @Get()
  list(@CurrentUser() user: JwtAuthUser) {
    return this.collectors.list(user.organizationId);
  }

  @Post()
  @RequireOrgPerm('collectors:write')
  create(@CurrentUser() user: JwtAuthUser, @Body() dto: CreateCollectorDto) {
    return this.collectors.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequireOrgPerm('collectors:write')
  update(@CurrentUser() user: JwtAuthUser, @Param('id') id: string, @Body() dto: UpdateCollectorDto) {
    return this.collectors.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @RequireOrgPerm('collectors:write')
  remove(@CurrentUser() user: JwtAuthUser, @Param('id') id: string) {
    return this.collectors.remove(id, user.organizationId);
  }
}
