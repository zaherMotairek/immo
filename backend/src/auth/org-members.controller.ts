import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { OrgMemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from './current-user.decorator';
import type { JwtAuthUser } from './jwt-user.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OrgPermGuard } from './org-perm.guard';
import { RequireOrgPerm } from './require-org-perm.decorator';
import { parseOrgMemberRole } from './org-permissions';

class UpdateOrgRoleDto {
  @IsEnum(OrgMemberRole)
  orgRole!: OrgMemberRole;
}

@Controller('me/members')
@UseGuards(JwtAuthGuard, OrgPermGuard)
export class OrgMembersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequireOrgPerm('users:invite')
  async list(@CurrentUser() user: JwtAuthUser) {
    const rows = await this.prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        orgRole: true,
        role: true,
        deactivatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      orgRole: parseOrgMemberRole(r.orgRole),
      isPlatformAdmin: r.role === 'PLATFORM_ADMIN',
      deactivated: Boolean(r.deactivatedAt),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  @Patch(':userId/org-role')
  @RequireOrgPerm('users:invite')
  async updateRole(
    @CurrentUser() user: JwtAuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrgRoleDto,
  ) {
    if (userId === user.id) {
      throw new ForbiddenException('Vous ne pouvez pas changer votre propre rôle.');
    }
    const target = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: user.organizationId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException('Utilisateur introuvable.');
    if (target.role === 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Rôle plateforme non modifiable ici.');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { orgRole: dto.orgRole },
      select: { id: true, email: true, orgRole: true },
    });
    return {
      id: updated.id,
      email: updated.email,
      orgRole: parseOrgMemberRole(updated.orgRole),
    };
  }
}
