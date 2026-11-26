import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { ResetOrgDataDto } from './dto/reset-org-data.dto';
import { seedRichDemoYear } from './org-rich-demo';
import { randomUUID } from 'crypto';
import {
  BuildingStructureKind,
  PaymentStatus,
  Prisma,
  UnitKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { rentDueDateForBilledPeriod, startOfTodayUtc } from '../common/date.util';

export type OnboardingStepId = 'building' | 'unit' | 'tenant' | 'lease' | 'payment';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  private assertOwner(user: JwtAuthUser) {
    if (user.orgRole !== 'OWNER') {
      throw new ForbiddenException('Réservé au propriétaire du compte (OWNER).');
    }
  }

  /** Tables collecteurs : schéma bootstrap (payment_id) ou migration (task_id) — toujours par organization_id. */
  private async purgePaymentCollectionTables(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<number> {
    try {
      await tx.$executeRawUnsafe(
        `DELETE FROM payment_collection_events WHERE organization_id = $1`,
        organizationId,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM payment_collection_tasks WHERE organization_id = $1`,
        organizationId,
      );
      const rc = await tx.$executeRawUnsafe(
        `DELETE FROM rent_collectors WHERE organization_id = $1`,
        organizationId,
      );
      return Number(rc) || 0;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/does not exist|relation.*payment_collection|relation.*rent_collector/i.test(msg)) {
        return 0;
      }
      throw e;
    }
  }

  async getStatus(organizationId: string, user?: JwtAuthUser) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { isDemo: true, automationSettings: true },
    });
    const settings =
      org?.automationSettings && typeof org.automationSettings === 'object' && !Array.isArray(org.automationSettings)
        ? (org.automationSettings as Record<string, unknown>)
        : {};

    const [buildings, units, tenants, leases, paidPayments] = await Promise.all([
      this.prisma.building.count({ where: { organizationId } }),
      this.prisma.unit.count({ where: { building: { organizationId } } }),
      this.prisma.tenant.count({ where: { organizationId } }),
      this.prisma.lease.count({ where: { unit: { building: { organizationId } } } }),
      this.prisma.payment.count({
        where: {
          status: PaymentStatus.PAID,
          lease: { unit: { building: { organizationId } } },
        },
      }),
    ]);

    const steps: Array<{
      id: OnboardingStepId;
      label: string;
      done: boolean;
      href: string;
    }> = [
      { id: 'building', label: 'Ajouter un bien', done: buildings > 0, href: '/biens' },
      { id: 'unit', label: 'Créer une unité', done: units > 0, href: '/biens' },
      { id: 'tenant', label: 'Ajouter un locataire', done: tenants > 0, href: '/locataires' },
      { id: 'lease', label: 'Créer un bail', done: leases > 0, href: '/baux' },
      { id: 'payment', label: 'Enregistrer un premier paiement', done: paidPayments > 0, href: '/paiements' },
    ];

    const complete = steps.every((s) => s.done);
    const dismissed = settings.onboardingDismissed === true;

    return {
      steps,
      complete,
      dismissed,
      /** Jamais auto : uniquement si org vide et non-démo. */
      canSeedSampleData: !org?.isDemo && buildings === 0,
      canLoadRichDemo: user?.orgRole === 'OWNER',
      canResetData: user?.orgRole === 'OWNER',
      isDemo: Boolean(org?.isDemo),
    };
  }

  async dismiss(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { automationSettings: true },
    });
    const prev =
      org?.automationSettings && typeof org.automationSettings === 'object' && !Array.isArray(org.automationSettings)
        ? { ...(org.automationSettings as Record<string, unknown>) }
        : {};
    prev.onboardingDismissed = true;
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { automationSettings: prev as unknown as Prisma.InputJsonValue },
    });
    return { ok: true };
  }

  /**
   * Charge un jeu d’exemple dans une org **vide** (pas isDemo).
   * Opt-in explicite — jamais par défaut en prod.
   */
  async seedSampleData(organizationId: string) {
    const status = await this.getStatus(organizationId);
    if (!status.canSeedSampleData) {
      throw new BadRequestException(
        'Données d’exemple disponibles uniquement sur une organisation non-démo sans biens.',
      );
    }

    const year = new Date().getUTCFullYear();
    const month = new Date().getUTCMonth() + 1;
    const rent = 150_000;

    await this.prisma.$transaction(async (tx) => {
      const building = await tx.building.create({
        data: {
          organizationId,
          name: 'Exemple — Villa Cocody',
          city: 'Abidjan',
          commune: 'Cocody',
          structureKind: BuildingStructureKind.MONO_LOT,
          notes: 'Données d’exemple (onboarding) — à remplacer.',
        },
      });
      const unit = await tx.unit.create({
        data: {
          buildingId: building.id,
          label: 'Logement principal',
          kind: UnitKind.APARTMENT,
        },
      });
      const tenant = await tx.tenant.create({
        data: {
          organizationId,
          firstName: 'Exemple',
          lastName: 'Locataire',
          phone: '+2250700000001',
          notes: 'Locataire d’exemple',
        },
      });
      const lease = await tx.lease.create({
        data: {
          unitId: unit.id,
          tenantId: tenant.id,
          startDate: new Date(Date.UTC(year, 0, 1)),
          endDate: new Date(Date.UTC(year, 11, 31)),
          monthlyRent: rent,
          rentDueDay: 5,
          depositAmount: rent * 2,
          active: true,
        },
      });
      await tx.payment.create({
        data: {
          leaseId: lease.id,
          periodYear: year,
          periodMonth: month,
          amountDue: rent,
          dueDate: rentDueDateForBilledPeriod(year, month, 5),
          status: PaymentStatus.PENDING,
        },
      });
      const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
      await tx.payment.create({
        data: {
          id: randomUUID(),
          leaseId: lease.id,
          periodYear: prev.y,
          periodMonth: prev.m,
          amountDue: rent,
          amountPaid: rent,
          dueDate: rentDueDateForBilledPeriod(prev.y, prev.m, 5),
          status: PaymentStatus.PAID,
          paidAt: startOfTodayUtc(),
        },
      });
    });

    return { ok: true, message: 'Données d’exemple chargées. Remplacez-les par vos vrais biens.' };
  }

  async loadRichDemoYear(user: JwtAuthUser) {
    this.assertOwner(user);
    const organizationId = user.organizationId;
    const stats = await this.prisma.$transaction((tx) => seedRichDemoYear(tx, organizationId));
    return {
      ok: true,
      message: `Jeu d’exemple ajouté : ${stats.buildings} biens, ${stats.leases} baux, ${stats.payments} échéances (${stats.throughMonth}/${stats.year}). Données fictives.`,
      stats,
    };
  }

  async resetOrgData(user: JwtAuthUser, dto: ResetOrgDataDto) {
    this.assertOwner(user);
    const organizationId = user.organizationId;
    const wipePayments = Boolean(dto.payments || dto.leases || dto.buildings);
    const wipeLeases = Boolean(dto.leases || dto.buildings);
    const wipeBuildings = Boolean(dto.buildings);
    const wipeTenants = Boolean(dto.tenants);
    const wipeCharges = Boolean(dto.charges || dto.buildings);
    const wipeRepairs = Boolean(dto.repairs);
    const wipeInspections = Boolean(dto.inspections);
    const wipeCollectors = Boolean(dto.collectors);

    if (
      !wipePayments &&
      !wipeLeases &&
      !wipeTenants &&
      !wipeBuildings &&
      !wipeCharges &&
      !wipeRepairs &&
      !wipeInspections &&
      !wipeCollectors
    ) {
      throw new BadRequestException('Cochez au moins une catégorie à supprimer.');
    }

    const counts: Record<string, number> = {};

    await this.prisma.$transaction(async (tx) => {
      if (wipeInspections) {
        try {
          const insp = await tx.leaseInspection.findMany({
            where: { organizationId },
            select: { id: true },
          });
          counts.inspections = insp.length;
          if (insp.length) {
            await tx.leaseInspectionPhoto.deleteMany({ where: { inspectionId: { in: insp.map((i) => i.id) } } });
            await tx.leaseInspectionItem.deleteMany({ where: { inspectionId: { in: insp.map((i) => i.id) } } });
            await tx.leaseInspection.deleteMany({ where: { organizationId } });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (/does not exist|lease_inspection/i.test(msg)) {
            counts.inspections = 0;
          } else {
            throw e;
          }
        }
      }

      if (wipeRepairs) {
        try {
          const repairs = await tx.repairRequest.findMany({
            where: { organizationId },
            select: { id: true },
          });
          counts.repairs = repairs.length;
          if (repairs.length) {
            await tx.repairPhoto.deleteMany({ where: { repairId: { in: repairs.map((r) => r.id) } } });
            await tx.repairRequest.deleteMany({ where: { organizationId } });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (/does not exist|repair_request/i.test(msg)) {
            counts.repairs = 0;
          } else {
            throw e;
          }
        }
      }

      const leaseFilter = { unit: { building: { organizationId } } };
      const leaseIds = wipePayments || wipeLeases
        ? (
            await tx.lease.findMany({ where: leaseFilter, select: { id: true } })
          ).map((l) => l.id)
        : [];

      if (wipePayments || wipeCollectors) {
        const n = await this.purgePaymentCollectionTables(tx, organizationId);
        if (wipeCollectors) counts.collectors = n;
      }

      if (wipePayments && leaseIds.length) {
        const rem = await tx.paymentReminder.deleteMany({
          where: { payment: { leaseId: { in: leaseIds } } },
        });
        counts.paymentReminders = rem.count;
        await tx.reminderOutbox.deleteMany({ where: { organizationId } });
        const p = await tx.payment.deleteMany({ where: { leaseId: { in: leaseIds } } });
        counts.payments = p.count;
      }

      if (wipeLeases && leaseIds.length) {
        await tx.leaseRentRevision.deleteMany({ where: { leaseId: { in: leaseIds } } });
        const l = await tx.lease.deleteMany({ where: { id: { in: leaseIds } } });
        counts.leases = l.count;
      }

      if (wipeCharges) {
        const c = await tx.charge.deleteMany({ where: { building: { organizationId } } });
        counts.charges = c.count;
      }

      if (wipeBuildings) {
        await tx.unit.deleteMany({ where: { building: { organizationId } } });
        const b = await tx.building.deleteMany({ where: { organizationId } });
        counts.buildings = b.count;
      }

      if (wipeTenants) {
        if (!wipeLeases) {
          const remainingLeases = await tx.lease.count({
            where: { unit: { building: { organizationId } } },
          });
          if (remainingLeases > 0) {
            throw new BadRequestException(
              'Des baux existent encore : cochez « Baux » (et échéances si besoin) ou supprimez-les avant les locataires.',
            );
          }
        }
        const t = await tx.tenant.deleteMany({ where: { organizationId } });
        counts.tenants = t.count;
      }
    });

    return {
      ok: true,
      message: 'Suppression terminée.',
      counts,
    };
  }
}
