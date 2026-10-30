import { BadRequestException, Injectable } from '@nestjs/common';
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

  async getStatus(organizationId: string) {
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
}
