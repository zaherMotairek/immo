import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { InviteOrganizationUserDto } from './dto/invite-organization-user.dto';
import { ResetOrganizationUserPasswordDto } from './dto/reset-organization-user-password.dto';
import { UpdateOrganizationBillingDto } from './dto/update-organization-billing.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liste des organisations (clients) pour le back-office plateforme. */
  async listOrganizations() {
    const rows = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        platformAccessPaidUntil: true,
        platformAccessSuspended: true,
        _count: { select: { users: true, buildings: true, tenants: true } },
        users: {
          take: 8,
          orderBy: { createdAt: 'asc' },
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });
    return rows.map((o) => ({
      id: o.id,
      name: o.name,
      createdAt: o.createdAt.toISOString(),
      platformAccessPaidUntil: o.platformAccessPaidUntil ? o.platformAccessPaidUntil.toISOString().slice(0, 10) : null,
      platformAccessSuspended: o.platformAccessSuspended,
      userCount: o._count.users,
      buildingCount: o._count.buildings,
      tenantCount: o._count.tenants,
      users: o.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
      })),
    }));
  }

  async updateOrganizationBilling(id: string, dto: UpdateOrganizationBillingDto) {
    if (dto.platformAccessPaidUntil === undefined && dto.platformAccessSuspended === undefined) {
      throw new BadRequestException('Indiquez au moins une modification (date ou suspension).');
    }
    const exists = await this.prisma.organization.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Organisation introuvable.');

    const data: Prisma.OrganizationUpdateInput = {};
    if (dto.platformAccessPaidUntil !== undefined) {
      data.platformAccessPaidUntil =
        dto.platformAccessPaidUntil === null
          ? null
          : new Date(`${dto.platformAccessPaidUntil.slice(0, 10)}T12:00:00.000Z`);
    }
    if (dto.platformAccessSuspended !== undefined) {
      data.platformAccessSuspended = dto.platformAccessSuspended;
    }

    const org = await this.prisma.organization.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        platformAccessPaidUntil: true,
        platformAccessSuspended: true,
      },
    });

    return {
      id: org.id,
      name: org.name,
      platformAccessPaidUntil: org.platformAccessPaidUntil ? org.platformAccessPaidUntil.toISOString().slice(0, 10) : null,
      platformAccessSuspended: org.platformAccessSuspended,
    };
  }

  /**
   * Nouvelle organisation + utilisateur `USER` (le client change le mot de passe depuis Profil).
   */
  async createClientOrganization(dto: CreateClientDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const orgName = dto.organizationName.trim();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { name: orgName },
        });
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: dto.ownerName?.trim() || null,
            organizationId: org.id,
            role: 'USER',
          },
          select: {
            id: true,
            email: true,
            name: true,
            organizationId: true,
          },
        });
        return { organization: org, user };
      });

      return {
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Un compte existe déjà avec cet e-mail.');
      }
      throw e;
    }
  }

  /**
   * Nouveau compte USER dans une organisation : mot de passe provisoire communiqué par l’admin (pas d’e-mail).
   */
  async inviteOrganizationUser(organizationId: string, dto: InviteOrganizationUserDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!org) throw new NotFoundException('Organisation introuvable.');

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail.');
    }

    const temporaryPassword =
      dto.password?.trim() && dto.password.trim().length >= 8
        ? dto.password.trim()
        : randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name?.trim() || null,
        organizationId,
        role: 'USER',
      },
      select: { id: true, email: true, name: true },
    });

    return {
      ok: true,
      organizationId: org.id,
      organizationName: org.name,
      userId: user.id,
      email: user.email,
      name: user.name,
      temporaryPassword,
    };
  }

  /**
   * L’admin plateforme fixe un nouveau mot de passe provisoire pour un utilisateur client (rôle USER).
   */
  async resetOrganizationUserPassword(
    organizationId: string,
    userId: string,
    dto: ResetOrganizationUserPasswordDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!org) throw new NotFoundException('Organisation introuvable.');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable dans cette organisation.');
    if (user.role === 'PLATFORM_ADMIN') {
      throw new BadRequestException('Impossible de réinitialiser un administrateur plateforme depuis ici.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    ]);

    return {
      ok: true,
      organizationId: org.id,
      organizationName: org.name,
      userId: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
