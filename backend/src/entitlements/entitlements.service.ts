import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfTodayUtc } from '../common/date.util';
import {
  parseOrgMemberRole,
  permissionsForOrgRole,
} from '../auth/org-permissions';
import type {
  EntitlementsDto,
  OrgMemberRoleDto,
  OrgSubscriptionStatus,
  PlanFeatureKey,
  PlanFeatures,
} from './entitlements.types';

const DEFAULT_FEATURES: PlanFeatures = {
  reminders: false,
  collectors: false,
  exports: true,
  closures: false,
};

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEntitlements(organizationId: string, userId?: string): Promise<EntitlementsDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        planCode: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        platformAccessSuspended: true,
        platformAccessPaidUntil: true,
      },
    });
    if (!org) throw new NotFoundException('Organisation introuvable');

    const plan = await this.prisma.plan.findUnique({ where: { code: org.planCode } });
    const features = this.parseFeatures(plan?.features);
    const [unitsUsed, usersUsed, member] = await Promise.all([
      this.prisma.unit.count({ where: { building: { organizationId } } }),
      this.prisma.user.count({ where: { organizationId } }),
      userId
        ? this.prisma.user.findUnique({
            where: { id: userId },
            select: { orgRole: true, role: true },
          })
        : Promise.resolve(null),
    ]);

    const subscriptionEndsAt = org.subscriptionEndsAt ?? org.platformAccessPaidUntil;
    const status = this.deriveStatus({
      planCode: org.planCode,
      trialEndsAt: org.trialEndsAt,
      subscriptionEndsAt,
      platformAccessSuspended: org.platformAccessSuspended,
    });

    const today = startOfTodayUtc();
    let trialDaysLeft: number | null = null;
    if (org.planCode === 'TRIAL' && org.trialEndsAt) {
      const ms = org.trialEndsAt.getTime() - today.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(ms / 86_400_000));
    }

    const orgRole: OrgMemberRoleDto =
      member?.role === 'PLATFORM_ADMIN'
        ? 'OWNER'
        : parseOrgMemberRole(member?.orgRole ?? 'OWNER');
    const permissions = permissionsForOrgRole(orgRole);

    return {
      planCode: org.planCode,
      planName: plan?.name ?? org.planCode,
      status,
      unitLimit: plan?.unitLimit ?? null,
      userLimit: plan?.userLimit ?? null,
      unitsUsed,
      usersUsed,
      features,
      trialEndsAt: org.trialEndsAt ? org.trialEndsAt.toISOString().slice(0, 10) : null,
      subscriptionEndsAt: subscriptionEndsAt ? subscriptionEndsAt.toISOString().slice(0, 10) : null,
      trialDaysLeft,
      monthlyPriceFcfa: plan?.monthlyPriceFcfa ?? 0,
      orgRole,
      permissions,
    };
  }

  deriveStatus(org: {
    planCode: string;
    trialEndsAt: Date | null;
    subscriptionEndsAt: Date | null;
    platformAccessSuspended: boolean;
  }): OrgSubscriptionStatus {
    if (org.platformAccessSuspended) return 'SUSPENDED';
    const today = startOfTodayUtc();
    const todayYmd = today.toISOString().slice(0, 10);

    if (org.planCode === 'FREE') return 'FREE';

    if (org.planCode === 'TRIAL') {
      if (org.trialEndsAt == null) return 'TRIAL';
      const end = org.trialEndsAt.toISOString().slice(0, 10);
      return end >= todayYmd ? 'TRIAL' : 'EXPIRED';
    }

    if (org.subscriptionEndsAt == null) return 'ACTIVE';
    const end = org.subscriptionEndsAt.toISOString().slice(0, 10);
    if (end < todayYmd) return 'EXPIRED';
    const in7 = new Date(today);
    in7.setUTCDate(in7.getUTCDate() + 7);
    if (end <= in7.toISOString().slice(0, 10)) return 'EXPIRING_SOON';
    return 'ACTIVE';
  }

  async assertCanCreateUnit(organizationId: string): Promise<void> {
    const e = await this.getEntitlements(organizationId);
    if (e.status === 'SUSPENDED' || e.status === 'EXPIRED') {
      throw new ForbiddenException(
        'Abonnement expiré ou suspendu : impossible d’ajouter une unité. Contactez le support.',
      );
    }
    if (e.unitLimit != null && e.unitsUsed >= e.unitLimit) {
      throw new ForbiddenException(
        `Limite du plan ${e.planName} atteinte (${e.unitLimit} unité${e.unitLimit !== 1 ? 's' : ''}). Passez à un plan supérieur.`,
      );
    }
  }

  async assertCanCreateUser(organizationId: string): Promise<void> {
    const e = await this.getEntitlements(organizationId);
    if (e.status === 'SUSPENDED' || e.status === 'EXPIRED') {
      throw new ForbiddenException(
        'Abonnement expiré ou suspendu : impossible d’ajouter un utilisateur.',
      );
    }
    if (e.userLimit != null && e.usersUsed >= e.userLimit) {
      throw new ForbiddenException(
        `Limite utilisateurs du plan ${e.planName} atteinte (${e.userLimit}).`,
      );
    }
  }

  async assertFeature(organizationId: string, feature: PlanFeatureKey): Promise<void> {
    const e = await this.getEntitlements(organizationId);
    if (e.status === 'SUSPENDED' || e.status === 'EXPIRED') {
      throw new ForbiddenException('Abonnement expiré ou suspendu : fonctionnalité indisponible.');
    }
    if (e.features[feature] !== true) {
      const labels: Record<PlanFeatureKey, string> = {
        reminders: 'relances automatiques',
        collectors: 'collecteurs',
        exports: 'exports',
        closures: 'clôtures comptables',
      };
      throw new ForbiddenException(
        `La fonctionnalité « ${labels[feature]} » n’est pas incluse dans le plan ${e.planName}.`,
      );
    }
  }

  /**
   * D2 : essais expirés → FREE (idempotent). Les données restent.
   * @returns nombre d’orgs basculées
   */
  async expireTrialsToFree(): Promise<number> {
    const today = startOfTodayUtc();
    const expired = await this.prisma.organization.findMany({
      where: {
        planCode: 'TRIAL',
        trialEndsAt: { lt: today },
      },
      select: { id: true, planCode: true },
    });
    let n = 0;
    for (const org of expired) {
      await this.prisma.$transaction([
        this.prisma.organization.update({
          where: { id: org.id },
          data: { planCode: 'FREE' },
        }),
        this.prisma.planChangeLog.create({
          data: {
            organizationId: org.id,
            fromPlanCode: 'TRIAL',
            toPlanCode: 'FREE',
            note: 'Expiration essai (job)',
          },
        }),
      ]);
      n += 1;
    }
    return n;
  }

  private parseFeatures(raw: unknown): PlanFeatures {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ...DEFAULT_FEATURES };
    }
    const o = raw as Record<string, unknown>;
    return {
      reminders: o.reminders === true,
      collectors: o.collectors === true,
      exports: o.exports !== false,
      closures: o.closures === true,
    };
  }
}
