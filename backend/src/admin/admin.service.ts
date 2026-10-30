import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma, SubscriptionPaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { startOfTodayUtc } from '../common/date.util';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { CreateClientDto } from './dto/create-client.dto';
import { InviteOrganizationUserDto } from './dto/invite-organization-user.dto';
import { ResetOrganizationUserPasswordDto } from './dto/reset-organization-user-password.dto';
import { UpdateOrganizationBillingDto } from './dto/update-organization-billing.dto';
import { UpdateOrganizationSubscriptionDto } from './dto/update-organization-subscription.dto';
import { RecordSubscriptionPaymentDto } from './dto/record-subscription-payment.dto';
import { STATUS_LABEL_FR, parseOptionalDate, ymd } from './admin-status.util';
import { addMonthsUtc, creditedMonthsForPrepaid } from '../billing/billing.config';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async dashboard() {
    const today = startOfTodayUtc();
    const in7 = new Date(today);
    in7.setUTCDate(in7.getUTCDate() + 7);
    const in3 = new Date(today);
    in3.setUTCDate(in3.getUTCDate() + 3);
    const inactiveBefore = new Date(today);
    inactiveBefore.setUTCDate(inactiveBefore.getUTCDate() - 14);
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

    const nonDemo = { isDemo: false };

    const [revenueAgg, expiringSubs, endingTrials, inactive, newSignups, clientCount] =
      await Promise.all([
        this.prisma.subscriptionPayment.aggregate({
          where: {
            paidAt: { gte: monthStart },
            organization: nonDemo,
          },
          _sum: { amountFcfa: true },
          _count: true,
        }),
        this.prisma.organization.findMany({
          where: {
            ...nonDemo,
            platformAccessSuspended: false,
            planCode: 'PRO',
            OR: [
              { subscriptionEndsAt: { gte: today, lte: in7 } },
              {
                subscriptionEndsAt: null,
                platformAccessPaidUntil: { gte: today, lte: in7 },
              },
            ],
          },
          select: { id: true, name: true, subscriptionEndsAt: true, platformAccessPaidUntil: true },
          take: 20,
        }),
        this.prisma.organization.findMany({
          where: {
            ...nonDemo,
            planCode: 'TRIAL',
            trialEndsAt: { gte: today, lte: in3 },
          },
          select: { id: true, name: true, trialEndsAt: true },
          take: 20,
        }),
        this.prisma.organization.findMany({
          where: {
            ...nonDemo,
            OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: inactiveBefore } }],
          },
          select: { id: true, name: true, lastLoginAt: true },
          orderBy: { lastLoginAt: 'asc' },
          take: 20,
        }),
        this.prisma.organization.count({
          where: { ...nonDemo, createdAt: { gte: monthStart } },
        }),
        this.prisma.organization.count({ where: nonDemo }),
      ]);

    return {
      monthlyRevenueFcfa: revenueAgg._sum.amountFcfa ?? 0,
      monthlyPaymentCount: revenueAgg._count,
      clientCount,
      newSignupsThisMonth: newSignups,
      expiringIn7Days: expiringSubs.map((o) => ({
        id: o.id,
        name: o.name,
        endsAt: ymd(o.subscriptionEndsAt ?? o.platformAccessPaidUntil),
      })),
      trialsEndingIn3Days: endingTrials.map((o) => ({
        id: o.id,
        name: o.name,
        trialEndsAt: ymd(o.trialEndsAt),
      })),
      inactive14Days: inactive.map((o) => ({
        id: o.id,
        name: o.name,
        lastLoginAt: o.lastLoginAt ? o.lastLoginAt.toISOString() : null,
      })),
    };
  }

  async listOrganizations(filters?: {
    q?: string;
    status?: string;
    planCode?: string;
  }) {
    const where: Prisma.OrganizationWhereInput = { isDemo: false };
    if (filters?.planCode) where.planCode = filters.planCode;
    if (filters?.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { users: { some: { email: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const rows = await this.prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        planCode: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        platformAccessPaidUntil: true,
        platformAccessSuspended: true,
        lastLoginAt: true,
        internalNotes: true,
        _count: { select: { users: true, buildings: true, tenants: true } },
        users: {
          take: 8,
          orderBy: { createdAt: 'asc' },
          select: { id: true, email: true, name: true, role: true, deactivatedAt: true },
        },
      },
    });

    const plans = await this.prisma.plan.findMany();
    const planByCode = new Map(plans.map((p) => [p.code, p]));

    const unitsByOrg = new Map<string, number>();
    for (const o of rows) {
      const n = await this.prisma.unit.count({ where: { building: { organizationId: o.id } } });
      unitsByOrg.set(o.id, n);
    }

    const mapped = rows.map((o) => {
      const plan = planByCode.get(o.planCode);
      const subscriptionEndsAt = o.subscriptionEndsAt ?? o.platformAccessPaidUntil;
      const status = this.entitlements.deriveStatus({
        planCode: o.planCode,
        trialEndsAt: o.trialEndsAt,
        subscriptionEndsAt,
        platformAccessSuspended: o.platformAccessSuspended,
      });
      return {
        id: o.id,
        name: o.name,
        createdAt: o.createdAt.toISOString(),
        planCode: o.planCode,
        planName: plan?.name ?? o.planCode,
        status,
        statusLabel: STATUS_LABEL_FR[status],
        trialEndsAt: ymd(o.trialEndsAt),
        subscriptionEndsAt: ymd(subscriptionEndsAt),
        platformAccessPaidUntil: ymd(o.platformAccessPaidUntil),
        platformAccessSuspended: o.platformAccessSuspended,
        lastLoginAt: o.lastLoginAt ? o.lastLoginAt.toISOString() : null,
        unitsUsed: unitsByOrg.get(o.id) ?? 0,
        unitLimit: plan?.unitLimit ?? null,
        userCount: o._count.users,
        buildingCount: o._count.buildings,
        tenantCount: o._count.tenants,
        users: o.users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          deactivated: u.deactivatedAt != null,
        })),
      };
    });

    if (filters?.status) {
      return mapped.filter((r) => r.status === filters.status);
    }
    return mapped;
  }

  async getOrganization(id: string) {
    const o = await this.prisma.organization.findFirst({
      where: { id, isDemo: false },
      include: {
        users: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            deactivatedAt: true,
            createdAt: true,
          },
        },
        subscriptionPayments: {
          orderBy: { paidAt: 'desc' },
          take: 50,
        },
        planChangeLogs: { orderBy: { createdAt: 'desc' }, take: 30 },
        _count: { select: { users: true, buildings: true, tenants: true } },
      },
    });
    if (!o) throw new NotFoundException('Organisation introuvable.');

    const [unitsUsed, leasesCount, paymentsCount, remindersSent, plan] = await Promise.all([
      this.prisma.unit.count({ where: { building: { organizationId: id } } }),
      this.prisma.lease.count({ where: { unit: { building: { organizationId: id } } } }),
      this.prisma.payment.count({ where: { lease: { unit: { building: { organizationId: id } } } } }),
      this.prisma.reminderOutbox.count({
        where: { organizationId: id, status: 'SENT' },
      }).catch(() => 0),
      this.prisma.plan.findUnique({ where: { code: o.planCode } }),
    ]);

    const subscriptionEndsAt = o.subscriptionEndsAt ?? o.platformAccessPaidUntil;
    const status = this.entitlements.deriveStatus({
      planCode: o.planCode,
      trialEndsAt: o.trialEndsAt,
      subscriptionEndsAt,
      platformAccessSuspended: o.platformAccessSuspended,
    });

    return {
      id: o.id,
      name: o.name,
      createdAt: o.createdAt.toISOString(),
      planCode: o.planCode,
      planName: plan?.name ?? o.planCode,
      monthlyPriceFcfa: plan?.monthlyPriceFcfa ?? 0,
      status,
      statusLabel: STATUS_LABEL_FR[status],
      trialEndsAt: ymd(o.trialEndsAt),
      subscriptionEndsAt: ymd(subscriptionEndsAt),
      platformAccessPaidUntil: ymd(o.platformAccessPaidUntil),
      platformAccessSuspended: o.platformAccessSuspended,
      lastLoginAt: o.lastLoginAt ? o.lastLoginAt.toISOString() : null,
      internalNotes: o.internalNotes,
      unitsUsed,
      unitLimit: plan?.unitLimit ?? null,
      userLimit: plan?.userLimit ?? null,
      activity: {
        buildingCount: o._count.buildings,
        unitCount: unitsUsed,
        tenantCount: o._count.tenants,
        leaseCount: leasesCount,
        paymentCount: paymentsCount,
        remindersSent,
        lastLoginAt: o.lastLoginAt ? o.lastLoginAt.toISOString() : null,
      },
      users: o.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        deactivated: u.deactivatedAt != null,
        createdAt: u.createdAt.toISOString(),
      })),
      payments: o.subscriptionPayments.map((p) => ({
        id: p.id,
        amountFcfa: p.amountFcfa,
        method: p.method,
        reference: p.reference,
        paidAt: ymd(p.paidAt),
        periodStart: ymd(p.periodStart),
        periodEnd: ymd(p.periodEnd),
        note: p.note,
        createdAt: p.createdAt.toISOString(),
      })),
      planChanges: o.planChangeLogs.map((c) => ({
        id: c.id,
        fromPlanCode: c.fromPlanCode,
        toPlanCode: c.toPlanCode,
        note: c.note,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async updateOrganizationBilling(id: string, dto: UpdateOrganizationBillingDto) {
    return this.updateSubscription(id, {
      platformAccessPaidUntil: dto.platformAccessPaidUntil,
      platformAccessSuspended: dto.platformAccessSuspended,
    });
  }

  async updateSubscription(id: string, dto: UpdateOrganizationSubscriptionDto, actor?: JwtAuthUser) {
    const org = await this.prisma.organization.findFirst({
      where: { id, isDemo: false },
      select: {
        id: true,
        name: true,
        planCode: true,
        subscriptionEndsAt: true,
        platformAccessPaidUntil: true,
      },
    });
    if (!org) throw new NotFoundException('Organisation introuvable.');

    const data: Prisma.OrganizationUpdateInput = {};
    if (dto.planCode !== undefined && dto.planCode !== org.planCode) {
      const plan = await this.prisma.plan.findUnique({ where: { code: dto.planCode } });
      if (!plan?.active) throw new BadRequestException('Plan inconnu ou inactif.');
      data.planCode = dto.planCode;
      await this.prisma.planChangeLog.create({
        data: {
          organizationId: id,
          fromPlanCode: org.planCode,
          toPlanCode: dto.planCode,
          actorUserId: actor?.id ?? null,
          note: 'Changement de plan (admin)',
        },
      });
    }

    const trial = parseOptionalDate(dto.trialEndsAt as string | null | undefined);
    if (trial !== undefined) data.trialEndsAt = trial;

    let subEnd = parseOptionalDate(dto.subscriptionEndsAt as string | null | undefined);
    const paidUntil = parseOptionalDate(dto.platformAccessPaidUntil as string | null | undefined);
    if (paidUntil !== undefined && subEnd === undefined) subEnd = paidUntil;

    if (dto.extendMonths != null && dto.extendMonths > 0) {
      const base =
        org.subscriptionEndsAt ??
        org.platformAccessPaidUntil ??
        startOfTodayUtc();
      const next = new Date(base);
      next.setUTCMonth(next.getUTCMonth() + dto.extendMonths);
      subEnd = next;
    }

    if (subEnd !== undefined) {
      data.subscriptionEndsAt = subEnd;
      data.platformAccessPaidUntil = subEnd;
    }
    if (dto.platformAccessSuspended !== undefined) {
      data.platformAccessSuspended = dto.platformAccessSuspended;
    }
    if (dto.internalNotes !== undefined) {
      data.internalNotes = dto.internalNotes;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Aucune modification.');
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        planCode: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        platformAccessPaidUntil: true,
        platformAccessSuspended: true,
        internalNotes: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      planCode: updated.planCode,
      trialEndsAt: ymd(updated.trialEndsAt),
      subscriptionEndsAt: ymd(updated.subscriptionEndsAt),
      platformAccessPaidUntil: ymd(updated.platformAccessPaidUntil),
      platformAccessSuspended: updated.platformAccessSuspended,
      internalNotes: updated.internalNotes,
    };
  }

  async recordSubscriptionPayment(
    organizationId: string,
    dto: RecordSubscriptionPaymentDto,
    actor?: JwtAuthUser,
  ) {
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, isDemo: false },
      select: { id: true, subscriptionEndsAt: true, platformAccessPaidUntil: true },
    });
    if (!org) throw new NotFoundException('Organisation introuvable.');

    const paidAt = new Date(`${dto.paidAt.slice(0, 10)}T12:00:00.000Z`);
    let periodStart: Date;
    let periodEnd: Date;
    let prepaidMonths: number | null = dto.prepaidMonths ?? null;

    if (dto.prepaidMonths) {
      const base =
        org.subscriptionEndsAt && org.subscriptionEndsAt > startOfTodayUtc()
          ? org.subscriptionEndsAt
          : org.platformAccessPaidUntil && org.platformAccessPaidUntil > startOfTodayUtc()
            ? org.platformAccessPaidUntil
            : startOfTodayUtc();
      periodStart = base;
      periodEnd = addMonthsUtc(base, creditedMonthsForPrepaid(dto.prepaidMonths));
    } else if (dto.periodStart && dto.periodEnd) {
      periodStart = new Date(`${dto.periodStart.slice(0, 10)}T12:00:00.000Z`);
      periodEnd = new Date(`${dto.periodEnd.slice(0, 10)}T12:00:00.000Z`);
    } else {
      throw new BadRequestException('Indiquez prepaidMonths (1|3|12) ou periodStart/periodEnd.');
    }

    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        organizationId,
        amountFcfa: dto.amountFcfa,
        method: dto.method as SubscriptionPaymentMethod,
        reference: dto.reference?.trim() || null,
        paidAt,
        periodStart,
        periodEnd,
        recordedByUserId: actor?.id ?? null,
        note: dto.note?.trim() || null,
        prepaidMonths,
        provider: dto.provider?.trim() || null,
        providerRef: dto.providerRef?.trim() || null,
      },
    });

    if (dto.extendAccess !== false) {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionEndsAt: payment.periodEnd,
          platformAccessPaidUntil: payment.periodEnd,
          platformAccessSuspended: false,
          planCode: 'PRO',
        },
      });
    }

    return {
      id: payment.id,
      amountFcfa: payment.amountFcfa,
      method: payment.method,
      paidAt: ymd(payment.paidAt),
      periodEnd: ymd(payment.periodEnd),
      prepaidMonths: payment.prepaidMonths,
      creditedMonths: dto.prepaidMonths ? creditedMonthsForPrepaid(dto.prepaidMonths) : null,
    };
  }

  async createClientOrganization(dto: CreateClientDto & {
    planCode?: string;
    trialEndsAt?: string;
    subscriptionEndsAt?: string;
  }) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Un compte existe déjà avec cet e-mail.');

    const rawPassword = dto.password?.trim() || randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const orgName = dto.organizationName.trim();
    const planCode = dto.planCode ?? 'TRIAL';
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan?.active) throw new BadRequestException('Plan inconnu.');

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: orgName,
            planCode,
            trialEndsAt: dto.trialEndsAt
              ? new Date(`${dto.trialEndsAt.slice(0, 10)}T12:00:00.000Z`)
              : planCode === 'TRIAL'
                ? (() => {
                    const d = startOfTodayUtc();
                    d.setUTCDate(d.getUTCDate() + 14);
                    return d;
                  })()
                : null,
            subscriptionEndsAt: dto.subscriptionEndsAt
              ? new Date(`${dto.subscriptionEndsAt.slice(0, 10)}T12:00:00.000Z`)
              : null,
            platformAccessPaidUntil: dto.subscriptionEndsAt
              ? new Date(`${dto.subscriptionEndsAt.slice(0, 10)}T12:00:00.000Z`)
              : null,
          },
        });
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: dto.ownerName?.trim() || null,
            organizationId: org.id,
            role: 'USER',
            emailVerifiedAt: new Date(),
          },
          select: { id: true, email: true, name: true, organizationId: true },
        });
        await tx.planChangeLog.create({
          data: {
            organizationId: org.id,
            fromPlanCode: null,
            toPlanCode: planCode,
            note: 'Création client (admin)',
          },
        });
        return { organization: org, user };
      });

      const reset = dto.password?.trim()
        ? {}
        : await this.createAndSendResetLink(result.user.id, result.user.email);

      return {
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        planCode,
        resetLinkSent: !dto.password?.trim(),
        ...(reset.devResetUrl ? { devResetUrl: reset.devResetUrl } : {}),
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Un compte existe déjà avec cet e-mail.');
      }
      throw e;
    }
  }

  /** Invite : mot de passe aléatoire + lien e-mail (admin ne choisit / ne voit pas le MDP). */
  async inviteOrganizationUser(organizationId: string, dto: InviteOrganizationUserDto) {
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, isDemo: false },
      select: { id: true, name: true },
    });
    if (!org) throw new NotFoundException('Organisation introuvable.');
    await this.entitlements.assertCanCreateUser(organizationId);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Un compte existe déjà avec cet e-mail.');

    const temporaryPassword = randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name?.trim() || null,
        organizationId,
        role: 'USER',
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, name: true },
    });

    const reset = await this.createAndSendResetLink(user.id, user.email);

    return {
      ok: true,
      organizationId: org.id,
      organizationName: org.name,
      userId: user.id,
      email: user.email,
      name: user.name,
      resetLinkSent: true,
      ...(reset.devResetUrl ? { devResetUrl: reset.devResetUrl } : {}),
    };
  }

  async forcePasswordResetLink(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, role: 'USER' },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    const reset = await this.createAndSendResetLink(user.id, user.email);
    return {
      ok: true,
      email: user.email,
      resetLinkSent: true,
      ...(reset.devResetUrl ? { devResetUrl: reset.devResetUrl } : {}),
    };
  }

  async setUserDeactivated(organizationId: string, userId: string, deactivated: boolean) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, role: true, email: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (user.role === 'PLATFORM_ADMIN') {
      throw new BadRequestException('Impossible de désactiver un admin plateforme.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt: deactivated ? new Date() : null },
    });
    return { ok: true, userId, email: user.email, deactivated };
  }

  /** Conservé pour compat : préfère forcePasswordResetLink (D3). */
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
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
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

  /**
   * Impersonation lecture seule 30 min : JWT sur le 1er USER actif de l’org.
   */
  async startImpersonation(organizationId: string, actor: JwtAuthUser) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throw new BadRequestException('Réservé aux administrateurs plateforme.');
    }
    const target = await this.prisma.user.findFirst({
      where: {
        organizationId,
        role: 'USER',
        deactivatedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: { organization: { select: { id: true, name: true, isDemo: true } } },
    });
    if (!target || target.organization.isDemo) {
      throw new NotFoundException('Aucun utilisateur client actif pour cette organisation.');
    }

    const expiresIn = '30m';
    const accessToken = await this.jwt.signAsync(
      {
        sub: target.id,
        email: target.email,
        organizationId: target.organizationId,
        impersonatorId: actor.id,
        readOnly: true,
      },
      { expiresIn },
    );

    await this.audit.log({
      organizationId,
      actor,
      action: 'ADMIN_IMPERSONATION_START',
      entityType: 'organization',
      entityId: organizationId,
      summary: `Vue client (lecture seule) par ${actor.email}`,
      metadata: { targetUserId: target.id, expiresIn },
    });

    return {
      accessToken,
      expiresInMinutes: 30,
      user: {
        id: target.id,
        email: target.email,
        name: target.name,
        organizationId: target.organizationId,
        organizationName: target.organization.name,
        role: 'USER' as const,
        readOnly: true,
        impersonatorId: actor.id,
      },
    };
  }

  /** Rappels d’échéance abo : J-7, J-1, J0 (idempotent via audit). */
  async sendSubscriptionExpiryNotices(): Promise<{ sent: number }> {
    const today = startOfTodayUtc();
    const targets: Array<{ days: number; action: string }> = [
      { days: 7, action: 'SUBSCRIPTION_NOTICE_7D' },
      { days: 1, action: 'SUBSCRIPTION_NOTICE_1D' },
      { days: 0, action: 'SUBSCRIPTION_NOTICE_0D' },
    ];
    let sent = 0;
    for (const t of targets) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() + t.days);
      const ymdTarget = ymd(day)!;
      const orgs = await this.prisma.organization.findMany({
        where: {
          isDemo: false,
          platformAccessSuspended: false,
          OR: [
            { subscriptionEndsAt: new Date(`${ymdTarget}T12:00:00.000Z`) },
            {
              subscriptionEndsAt: null,
              platformAccessPaidUntil: new Date(`${ymdTarget}T12:00:00.000Z`),
            },
          ],
        },
        include: {
          users: {
            where: { role: 'USER', deactivatedAt: null },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      for (const org of orgs) {
        const already = await this.prisma.$queryRawUnsafe<Array<{ c: number }>>(
          `SELECT COUNT(*)::int AS c FROM audit_logs
           WHERE organization_id = $1 AND action = $2
             AND created_at::date = CURRENT_DATE`,
          org.id,
          t.action,
        ).catch(() => [{ c: 0 }]);
        if ((already[0]?.c ?? 0) > 0) continue;
        const email = org.users[0]?.email;
        if (!email) continue;
        const subject =
          t.days === 0
            ? 'Votre abonnement ImmoPilot a expiré'
            : `Votre abonnement ImmoPilot expire dans ${t.days} jour${t.days > 1 ? 's' : ''}`;
        await this.mail.sendTextEmail(email, subject, `${subject}\n\nOrganisation : ${org.name ?? org.id}\n— ImmoPilot`);
        await this.audit.log({
          organizationId: org.id,
          action: t.action,
          entityType: 'organization',
          entityId: org.id,
          summary: subject,
          metadata: { email, days: t.days },
        });
        sent += 1;
      }
    }
    return { sent };
  }

  private async createAndSendResetLink(userId: string, email: string) {
    await this.prisma.passwordResetToken.deleteMany({ where: { userId } });
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await this.prisma.passwordResetToken.create({ data: { userId, token, expiresAt } });
    const base = (this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${base}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;
    const mailResult = await this.mail.sendPasswordResetEmail(email, resetUrl);
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && mailResult.simulated) {
      return { devResetUrl: resetUrl };
    }
    return {};
  }
}
