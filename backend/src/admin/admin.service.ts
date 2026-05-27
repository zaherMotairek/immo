import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateClientDto } from './dto/create-client.dto';
import { InviteOrganizationUserDto } from './dto/invite-organization-user.dto';
import { UpdateOrganizationBillingDto } from './dto/update-organization-billing.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

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
   * Nouvelle organisation + utilisateur `USER` (le client change le mot de passe depuis Profil ou « oubli »).
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

  /** Invite un utilisateur existant au sens business (nouveau compte USER) dans une organisation cliente. */
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

    const tempPassword = randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: dto.name?.trim() || null,
          organizationId,
          role: 'USER',
        },
        select: { id: true, email: true, name: true },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId: created.id } });
      await tx.passwordResetToken.create({
        data: { userId: created.id, token: resetToken, expiresAt },
      });
      return created;
    });

    const base = (this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${base}/reinitialiser-mot-de-passe?token=${encodeURIComponent(resetToken)}`;
    const mailResult = await this.mail.sendPasswordResetEmail(user.email, resetUrl);

    return {
      ok: true,
      organizationId: org.id,
      organizationName: org.name,
      userId: user.id,
      email: user.email,
      name: user.name,
      resetMailSimulated: mailResult.simulated,
      devResetUrl: process.env.NODE_ENV !== 'production' && mailResult.simulated ? resetUrl : undefined,
    };
  }
}
