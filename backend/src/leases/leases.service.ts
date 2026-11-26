import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PaymentStatus, type Lease } from '@prisma/client';
import type { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { PaymentsService } from '../payments/payments.service';
import { AutomationService } from '../automation/automation.service';
import { addOneYearSameDay, rentDueDateForBilledPeriod, startOfTodayUtc } from '../common/date.util';
import { assertAllowedUploadMagic } from '../common/file-magic';
import { StorageService } from '../storage/storage.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import {
  LEASE_CONTRACT_ALLOWED_MIMES,
  LEASE_CONTRACT_MAX_BYTES,
  LEASE_CONTRACT_MIME_TO_EXT,
} from './lease-contract.constants';
import {
  drawField,
  drawFooter,
  drawScheduleTable,
  drawSectionHeading,
  drawTopBanner,
  formatDatePdfFr,
  formatFcfaPdf,
  pdfSafeText,
} from '../common/immo-pdf';

function leaseBelongsToOrg(organizationId: string) {
  return { unit: { building: { organizationId } } };
}

function paymentStatusFr(s: PaymentStatus | undefined): string {
  if (!s) return '-';
  switch (s) {
    case PaymentStatus.PAID:
      return 'Payé';
    case PaymentStatus.LATE:
      return 'En retard';
    case PaymentStatus.CANCELLED:
      return 'Annulé';
    case PaymentStatus.WAIVED:
      return 'Loyer offert';
    default:
      return 'Impayé';
  }
}

function unitKindFr(kind: string): string {
  const m: Record<string, string> = {
    APARTMENT: 'Appartement',
    HOUSE: 'Maison',
    LAND: 'Terrain',
    OFFICE: 'Bureau',
    WAREHOUSE: 'Entrepôt',
    COMMERCIAL: 'Local commercial',
    GARAGE: 'Garage (parking)',
    OTHER: 'Autre',
  };
  return m[kind] ?? kind;
}

function fmtDateFr(d: unknown): string {
  return formatDatePdfFr(d as Date | string | null | undefined);
}

@Injectable()
export class LeasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly automation: AutomationService,
  ) {}

  list(organizationId: string) {
    return this.prisma.lease.findMany({
      where: leaseBelongsToOrg(organizationId),
      orderBy: { startDate: 'desc' },
      include: {
        tenant: true,
        unit: { include: { building: true } },
      },
    });
  }

  /** Liste synthétique pour cartes « locations » (tableau de bord métier). */
  async listOverview(organizationId: string, activeOnly = true) {
    await this.payments.syncLateStatuses(organizationId);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    const leases = await this.prisma.lease.findMany({
      where: {
        ...leaseBelongsToOrg(organizationId),
        ...(activeOnly ? { active: true } : {}),
      },
      orderBy: { startDate: 'desc' },
      include: {
        tenant: true,
        unit: { include: { building: true } },
      },
    });

    const ids = leases.map((l) => l.id);
    const payments =
      ids.length === 0
        ? []
        : await this.prisma.payment.findMany({
            where: { leaseId: { in: ids }, periodYear: y, periodMonth: m },
          });
    const payMap = new Map(payments.map((p) => [p.leaseId, p]));

    return leases.map((l) => {
      const b = l.unit.building;
      const pay = payMap.get(l.id);
      return {
        leaseId: l.id,
        active: l.active,
        tenantId: l.tenantId,
        buildingId: b.id,
        unitId: l.unitId,
        localizationLine: [b.commune, b.city].filter(Boolean).join(' · '),
        buildingName: b.name,
        unitLabel: l.unit.label,
        unitKind: l.unit.kind,
        tenantFullName: `${l.tenant.firstName} ${l.tenant.lastName}`.trim(),
        monthlyRent: l.monthlyRent.toNumber(),
        rentDueDay: l.rentDueDay,
        currentMonthStatus: pay?.status,
        currentMonthStatusFr: paymentStatusFr(pay?.status),
      };
    });
  }

  async listDepositsCollected(organizationId: string) {
    const leases = await this.prisma.lease.findMany({
      where: {
        ...leaseBelongsToOrg(organizationId),
        depositPaidAt: { not: null },
        depositAmount: { not: null, gt: 0 },
      },
      orderBy: { depositPaidAt: 'desc' },
      include: {
        tenant: true,
        unit: { include: { building: true } },
      },
    });

    return leases.map((l) => {
      const b = l.unit.building;
      const paidAt = l.depositPaidAt!;
      return {
        leaseId: l.id,
        active: l.active,
        monthlyRent: l.monthlyRent.toNumber(),
        depositAmount: l.depositAmount!.toNumber(),
        depositPaidAt: paidAt.toISOString().slice(0, 10),
        tenantFullName: `${l.tenant.firstName} ${l.tenant.lastName}`.trim(),
        buildingName: b.name,
        unitLabel: l.unit.label,
        localizationLine: [b.commune, b.city].filter(Boolean).join(' · '),
      };
    });
  }

  async getFiche(id: string, organizationId: string) {
    await this.payments.syncLateStatuses(organizationId);
    const l = await this.prisma.lease.findFirst({
      where: { id, ...leaseBelongsToOrg(organizationId) },
      include: {
        tenant: true,
        unit: { include: { building: true } },
        payments: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }], take: 24 },
      },
    });
    if (!l) throw new NotFoundException('Location introuvable');

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const currentPayment = await this.prisma.payment.findFirst({
      where: { leaseId: id, periodYear: y, periodMonth: m },
    });

    const b = l.unit.building;
    const u = l.unit;
    const t = l.tenant;

    return {
      leaseId: l.id,
      active: l.active,
      startDate: l.startDate,
      endDate: l.endDate,
      localization: {
        city: b.city,
        commune: b.commune,
        address: b.address,
        postalCode: b.postalCode,
        country: b.country,
        shortLabel: [b.commune, b.city].filter(Boolean).join(', '),
      },
      property: {
        buildingName: b.name,
        buildingId: b.id,
        unitId: u.id,
        unitLabel: u.label,
        kind: u.kind,
        floor: u.floor,
        rooms: u.rooms,
        surfaceM2: u.surfaceM2?.toNumber() ?? null,
        description: u.description,
        notes: u.notes,
      },
      tenant: {
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        fullName: `${t.firstName} ${t.lastName}`.trim(),
        phone: t.phone,
        email: t.email,
      },
      financial: {
        monthlyRent: l.monthlyRent.toNumber(),
        rentDueDay: l.rentDueDay,
        depositAmount: l.depositAmount?.toNumber() ?? null,
        depositPaidAt: l.depositPaidAt ? l.depositPaidAt.toISOString().slice(0, 10) : null,
        currentPeriodYear: y,
        currentPeriodMonth: m,
        currentPaymentStatus: currentPayment?.status,
        currentPaymentStatusFr: paymentStatusFr(currentPayment?.status),
        currentPaymentDueDate: currentPayment?.dueDate ?? null,
      },
      contract: l.contractFileKey
        ? {
            fileName: l.contractFileOriginalName,
            mimeType: l.contractFileMime,
            size: l.contractFileSize,
            uploadedAt: l.contractUploadedAt?.toISOString() ?? null,
          }
        : null,
      paymentSchedule: [...l.payments]
        .sort((a, b) =>
          a.periodYear !== b.periodYear ? a.periodYear - b.periodYear : a.periodMonth - b.periodMonth,
        )
        .map((p) => ({
          id: p.id,
          periodYear: p.periodYear,
          periodMonth: p.periodMonth,
          dueDate: p.dueDate.toISOString().slice(0, 10),
          amountDue: p.amountDue.toNumber(),
          amountPaid: p.amountPaid?.toNumber() ?? null,
          status: p.status,
          statusFr: paymentStatusFr(p.status),
          waiveReason: p.waiveReason,
          waivedAt: p.waivedAt ? p.waivedAt.toISOString().slice(0, 10) : null,
        })),
    };
  }

  async get(id: string, organizationId: string) {
    const l = await this.prisma.lease.findFirst({
      where: { id, ...leaseBelongsToOrg(organizationId) },
      include: {
        tenant: true,
        unit: { include: { building: true } },
        payments: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }] },
      },
    });
    if (!l) throw new NotFoundException('Bail introuvable');
    return l;
  }

  async create(dto: CreateLeaseDto, organizationId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, building: { organizationId } },
    });
    if (!unit) throw new BadRequestException('Unité introuvable ou hors de votre organisation.');
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: dto.tenantId, organizationId },
    });
    if (!tenant) throw new BadRequestException('Locataire introuvable ou hors de votre organisation.');

    const activeCount = await this.prisma.lease.count({
      where: { unitId: dto.unitId, active: true },
    });
    if (activeCount > 0) {
      throw new BadRequestException('Cette unité a déjà un bail actif. Terminez ou désactivez-le avant d’en créer un nouveau.');
    }

    let deposit: number | null | undefined = dto.depositAmount;
    if (dto.depositMonths != null && dto.depositMonths > 0) {
      deposit = dto.monthlyRent * dto.depositMonths;
    }
    if (deposit !== undefined && deposit !== null && deposit <= 0) {
      deposit = null;
    }

    const startDate = new Date(dto.startDate);
    const automation = await this.automation.getSettings(organizationId);
    const hasExplicitEnd = dto.endDate != null && String(dto.endDate).trim() !== '';
    /** C1 : sans date de fin + opt-in → bail open-ended (horizon 12 mois). Sinon +1 an. */
    const endDate = hasExplicitEnd
      ? new Date(dto.endDate!)
      : automation.autoGenerateSchedules
        ? null
        : addOneYearSameDay(startDate);

    const lease = await this.prisma.lease.create({
      data: {
        unitId: dto.unitId,
        tenantId: dto.tenantId,
        startDate,
        endDate,
        monthlyRent: dto.monthlyRent,
        depositAmount: deposit ?? null,
        rentDueDay: dto.rentDueDay ?? 1,
        active: dto.active ?? true,
      },
      include: { tenant: true, unit: { include: { building: true } } },
    });

    if (lease.active) {
      if (lease.endDate) {
        await this.generatePaymentsFromLeaseStartUntilContractEnd(lease.id, lease);
      }
      if (automation.autoGenerateSchedules) {
        await this.ensureScheduleMonthsAhead(lease.id, lease, 12);
      }
    }

    return lease;
  }

  /**
   * Premier mois de loyer : le mois **suivant** celui où le bail a été enregistré (ex. contrat en avril → 1ᵉʳ loyer en mai).
   * Si la date de début de bail est dans un mois plus tard, on commence à ce mois-là (ex. bail à partir de juin → 1ᵉʳ loyer en juin).
   * L’échéance tombe le jour `rentDueDay` dans le mois de la période (cf. `rentDueDateForBilledPeriod`).
   */
  private firstBillingPeriodMonth(leaseStartDate: Date, leaseCreatedAt: Date): { y: number; m: number } {
    let ny = leaseCreatedAt.getFullYear();
    let nm = leaseCreatedAt.getMonth() + 2;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    const ly = leaseStartDate.getFullYear();
    const lm = leaseStartDate.getMonth() + 1;
    const nextAfterContractMonth = ny * 12 + nm;
    const startSeq = ly * 12 + lm;
    if (startSeq > nextAfterContractMonth) {
      return { y: ly, m: lm };
    }
    return { y: ny, m: nm };
  }

  /** Dernière période facturable : mois calendaire de la date de fin de bail (inclus). */
  private async generatePaymentsFromLeaseStartUntilContractEnd(
    leaseId: string,
    lease: Pick<Lease, 'startDate' | 'endDate' | 'monthlyRent' | 'rentDueDay' | 'createdAt'>,
  ) {
    if (!lease.endDate) return;
    const { y: firstY, m: firstM } = this.firstBillingPeriodMonth(lease.startDate, lease.createdAt);
    const lastY = lease.endDate.getFullYear();
    const lastM = lease.endDate.getMonth() + 1;
    await this.createPaymentRange(leaseId, lease, firstY, firstM, lastY, lastM);
  }

  /**
   * C1 : crée les échéances manquantes jusqu’à `monthsAhead` mois après aujourd’hui
   * (ou jusqu’à endDate si plus tôt). N’écrase jamais (unique leaseId+year+month).
   */
  async ensureScheduleMonthsAhead(
    leaseId: string,
    lease: Pick<Lease, 'startDate' | 'endDate' | 'monthlyRent' | 'rentDueDay' | 'createdAt'>,
    monthsAhead: number,
  ): Promise<number> {
    const { y: firstY, m: firstM } = this.firstBillingPeriodMonth(lease.startDate, lease.createdAt);
    const today = startOfTodayUtc();
    let lastY = today.getUTCFullYear();
    let lastM = today.getUTCMonth() + 1 + monthsAhead;
    while (lastM > 12) {
      lastM -= 12;
      lastY += 1;
    }
    if (lease.endDate) {
      const ey = lease.endDate.getFullYear();
      const em = lease.endDate.getMonth() + 1;
      if (ey * 12 + em < lastY * 12 + lastM) {
        lastY = ey;
        lastM = em;
      }
    }
    return this.createPaymentRange(leaseId, lease, firstY, firstM, lastY, lastM);
  }

  /** Job annuel / manuel : org avec autoGenerateSchedules. */
  async extendSchedulesForOrganization(
    organizationId: string,
    monthsAhead = 12,
  ): Promise<{ created: number; leases: number }> {
    const leases = await this.prisma.lease.findMany({
      where: { active: true, ...leaseBelongsToOrg(organizationId) },
    });
    let created = 0;
    for (const lease of leases) {
      created += await this.ensureScheduleMonthsAhead(lease.id, lease, monthsAhead);
    }
    return { created, leases: leases.length };
  }

  private async createPaymentRange(
    leaseId: string,
    lease: Pick<Lease, 'monthlyRent' | 'rentDueDay'>,
    firstY: number,
    firstM: number,
    lastY: number,
    lastM: number,
  ): Promise<number> {
    const firstSeq = firstY * 12 + firstM;
    const lastSeq = lastY * 12 + lastM;
    if (firstSeq > lastSeq) return 0;
    let y = firstY;
    let mo = firstM;
    let created = 0;
    while (y * 12 + mo <= lastSeq) {
      const due = rentDueDateForBilledPeriod(y, mo, lease.rentDueDay);
      try {
        await this.prisma.payment.create({
          data: {
            leaseId,
            periodYear: y,
            periodMonth: mo,
            amountDue: lease.monthlyRent,
            dueDate: due,
            status: PaymentStatus.PENDING,
          },
        });
        created += 1;
      } catch {
        /* déjà créé */
      }
      mo += 1;
      if (mo > 12) {
        mo = 1;
        y += 1;
      }
    }
    return created;
  }

  /** Recalcule les échéances modifiables d’un bail selon ses conditions actuelles. */
  private async resyncMutablePaymentsFromLeaseTerms(
    leaseId: string,
    lease: Pick<Lease, 'startDate' | 'endDate' | 'monthlyRent' | 'rentDueDay' | 'createdAt' | 'active'>,
  ) {
    const all = await this.prisma.payment.findMany({
      where: { leaseId },
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
    });
    const mutable = all.filter((p) => p.status === PaymentStatus.PENDING || p.status === PaymentStatus.LATE);
    const immutable = all.filter((p) => p.status !== PaymentStatus.PENDING && p.status !== PaymentStatus.LATE);
    if (mutable.length === 0 && (!lease.active || !lease.endDate)) return;

    const expected = new Map<string, { year: number; month: number; dueDate: Date }>();
    if (lease.active && lease.endDate) {
      const { y: firstY, m: firstM } = this.firstBillingPeriodMonth(lease.startDate, lease.createdAt);
      const lastY = lease.endDate.getFullYear();
      const lastM = lease.endDate.getMonth() + 1;
      let y = firstY;
      let m = firstM;
      while (y * 12 + m <= lastY * 12 + lastM) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        expected.set(key, { year: y, month: m, dueDate: rentDueDateForBilledPeriod(y, m, lease.rentDueDay) });
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }

    const today = startOfTodayUtc();
    // Les échéances déjà soldées/gelées gardent leur période : ne jamais recréer ces clés.
    for (const p of immutable) {
      const key = `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`;
      expected.delete(key);
    }

    for (const p of mutable) {
      const key = `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`;
      const target = expected.get(key);
      if (!target) {
        await this.prisma.payment.delete({ where: { id: p.id } });
        continue;
      }
      const nextStatus = target.dueDate < today ? PaymentStatus.LATE : PaymentStatus.PENDING;
      await this.prisma.payment.update({
        where: { id: p.id },
        data: {
          amountDue: lease.monthlyRent,
          dueDate: target.dueDate,
          status: nextStatus,
        },
      });
      expected.delete(key);
    }

    for (const item of expected.values()) {
      const status = item.dueDate < today ? PaymentStatus.LATE : PaymentStatus.PENDING;
      await this.prisma.payment.create({
        data: {
          leaseId,
          periodYear: item.year,
          periodMonth: item.month,
          amountDue: lease.monthlyRent,
          dueDate: item.dueDate,
          status,
        },
      });
    }
  }

  /**
   * C6-A : révision de loyer (+ renouvellement optionnel de endDate).
   * N’écrase pas les échéances PAID/WAIVED/CANCELLED.
   */
  async reviseRent(
    id: string,
    organizationId: string,
    dto: {
      newMonthlyRent?: number;
      percent?: number;
      effectiveFrom: string;
      newEndDate?: string;
      renew?: boolean;
      note?: string;
    },
    actor?: JwtAuthUser,
  ) {
    await this.ensure(id, organizationId);
    const lease = await this.prisma.lease.findUnique({ where: { id } });
    if (!lease) throw new NotFoundException('Bail introuvable');
    if (!lease.active) throw new BadRequestException('Bail inactif.');

    const previous = lease.monthlyRent.toNumber();
    let newRent = dto.newMonthlyRent;
    let percent: number | null = dto.percent ?? null;
    if (newRent == null && percent != null) {
      newRent = Math.round(previous * (1 + percent / 100));
    }
    if (newRent == null || !Number.isFinite(newRent) || newRent < 1) {
      throw new BadRequestException('Indiquez newMonthlyRent ou percent.');
    }
    if (percent == null && previous > 0) {
      percent = Math.round(((newRent - previous) / previous) * 10000) / 100;
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effY = effectiveFrom.getUTCFullYear();
    const effM = effectiveFrom.getUTCMonth() + 1;
    const renew = Boolean(dto.renew || dto.newEndDate);
    let newEndDate: Date | undefined;
    if (dto.newEndDate) {
      newEndDate = new Date(dto.newEndDate);
    } else if (renew && lease.endDate) {
      newEndDate = addOneYearSameDay(lease.endDate);
    } else if (renew) {
      newEndDate = addOneYearSameDay(lease.startDate);
    }

    const updated = await this.prisma.lease.update({
      where: { id },
      data: {
        monthlyRent: newRent,
        ...(newEndDate ? { endDate: newEndDate } : {}),
      },
      include: { tenant: true, unit: { include: { building: true } } },
    });

    const mutable = await this.prisma.payment.findMany({
      where: {
        leaseId: id,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] },
      },
    });
    for (const p of mutable) {
      const seq = p.periodYear * 12 + p.periodMonth;
      if (seq < effY * 12 + effM) continue;
      await this.prisma.payment.update({
        where: { id: p.id },
        data: { amountDue: newRent },
      });
    }

    if (newEndDate) {
      await this.ensureScheduleMonthsAhead(id, {
        startDate: updated.startDate,
        endDate: updated.endDate,
        monthlyRent: updated.monthlyRent,
        rentDueDay: updated.rentDueDay,
        createdAt: lease.createdAt,
      }, 12);
    }

    await this.prisma.leaseRentRevision.create({
      data: {
        leaseId: id,
        effectiveFrom,
        previousRent: previous,
        newRent,
        percent: percent ?? undefined,
        note: dto.note?.trim() || null,
        createdByUserId: actor?.id ?? null,
        renewed: renew,
        newEndDate: newEndDate ?? null,
      },
    });

    await this.audit.log({
      organizationId,
      actor,
      action: renew ? 'LEASE_RENEWED' : 'LEASE_RENT_REVISED',
      entityType: 'lease',
      entityId: id,
      summary: renew
        ? `Bail renouvelé / loyer ${previous} → ${newRent} FCFA`
        : `Révision loyer ${previous} → ${newRent} FCFA`,
      metadata: { previous, newRent, percent, effectiveFrom: dto.effectiveFrom, newEndDate: dto.newEndDate ?? null },
    });

    return updated;
  }

  async update(id: string, organizationId: string, dto: UpdateLeaseDto, actor?: JwtAuthUser) {
    await this.ensure(id, organizationId);
    const before = await this.prisma.lease.findUnique({
      where: { id },
      select: {
        startDate: true,
        endDate: true,
        rentDueDay: true,
        monthlyRent: true,
        active: true,
        createdAt: true,
      },
    });
    if (!before) throw new NotFoundException('Bail introuvable');
    const data: Record<string, unknown> = {};
    if (dto.unitId !== undefined) data.unitId = dto.unitId;
    if (dto.tenantId !== undefined) data.tenantId = dto.tenantId;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.monthlyRent !== undefined) data.monthlyRent = dto.monthlyRent;
    if (dto.depositAmount !== undefined) data.depositAmount = dto.depositAmount;
    if (dto.depositPaidAt !== undefined) {
      data.depositPaidAt = dto.depositPaidAt ? new Date(dto.depositPaidAt) : null;
    }
    if (dto.rentDueDay !== undefined) data.rentDueDay = dto.rentDueDay;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.unitId !== undefined) {
      const u = await this.prisma.unit.findFirst({
        where: { id: dto.unitId, building: { organizationId } },
      });
      if (!u) throw new BadRequestException('Unité introuvable ou hors de votre organisation.');
    }
    if (dto.tenantId !== undefined) {
      const t = await this.prisma.tenant.findFirst({
        where: { id: dto.tenantId, organizationId },
      });
      if (!t) throw new BadRequestException('Locataire introuvable ou hors de votre organisation.');
    }
    const updated = await this.prisma.lease.update({
      where: { id },
      data,
      include: { tenant: true, unit: { include: { building: true } } },
    });
    const dateOrScheduleChanged =
      dto.startDate !== undefined ||
      dto.endDate !== undefined ||
      dto.rentDueDay !== undefined ||
      dto.active !== undefined ||
      dto.monthlyRent !== undefined;
    if (dateOrScheduleChanged) {
      await this.resyncMutablePaymentsFromLeaseTerms(id, {
        startDate: updated.startDate,
        endDate: updated.endDate,
        monthlyRent: updated.monthlyRent,
        rentDueDay: updated.rentDueDay,
        createdAt: before.createdAt,
        active: updated.active,
      });
      const automation = await this.automation.getSettings(organizationId);
      if (automation.autoGenerateSchedules && updated.active) {
        await this.ensureScheduleMonthsAhead(id, {
          startDate: updated.startDate,
          endDate: updated.endDate,
          monthlyRent: updated.monthlyRent,
          rentDueDay: updated.rentDueDay,
          createdAt: before.createdAt,
        }, 12);
      }
    }
    await this.audit.log({
      organizationId,
      actor,
      action: 'LEASE_UPDATED',
      entityType: 'lease',
      entityId: id,
      summary: 'Parametres du bail modifies',
      metadata: {
        active: updated.active,
        monthlyRent: updated.monthlyRent.toNumber(),
        rentDueDay: updated.rentDueDay,
      },
    });
    return updated;
  }

  async remove(id: string, organizationId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, ...leaseBelongsToOrg(organizationId) },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');
    await this.removeContractFileFromDisk(lease.contractFileKey);
    await this.prisma.lease.delete({ where: { id } });
    return { ok: true };
  }

  private contractIndexKey(leaseId: string): string {
    return `_index/${leaseId}.json`;
  }

  private async readContractIndex(leaseId: string): Promise<Array<{
    fileKey: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>> {
    const buf = await this.storage.get('lease-contracts', this.contractIndexKey(leaseId));
    if (!buf) return [];
    try {
      const j = JSON.parse(buf.toString('utf-8')) as unknown;
      if (!Array.isArray(j)) return [];
      return j.filter(
        (x): x is { fileKey: string; fileName: string; mimeType: string; size: number; uploadedAt: string } =>
          !!x &&
          typeof (x as { fileKey?: unknown }).fileKey === 'string' &&
          typeof (x as { fileName?: unknown }).fileName === 'string' &&
          typeof (x as { mimeType?: unknown }).mimeType === 'string' &&
          typeof (x as { size?: unknown }).size === 'number' &&
          typeof (x as { uploadedAt?: unknown }).uploadedAt === 'string',
      );
    } catch {
      return [];
    }
  }

  private async writeContractIndex(
    leaseId: string,
    files: Array<{ fileKey: string; fileName: string; mimeType: string; size: number; uploadedAt: string }>,
  ) {
    await this.storage.put(
      'lease-contracts',
      this.contractIndexKey(leaseId),
      Buffer.from(JSON.stringify(files, null, 2), 'utf-8'),
      'application/json',
    );
  }

  async listContracts(leaseId: string, organizationId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, ...leaseBelongsToOrg(organizationId) },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');
    return this.readContractIndex(leaseId);
  }

  private async removeContractFileFromDisk(key: string | null | undefined) {
    if (!key) return;
    await this.storage.delete('lease-contracts', key);
  }

  async saveContract(leaseId: string, organizationId: string, file: Express.Multer.File, actor?: JwtAuthUser) {
    if (file.size > LEASE_CONTRACT_MAX_BYTES) {
      throw new BadRequestException('Fichier trop volumineux (15 Mo maximum).');
    }
    const magic = assertAllowedUploadMagic(file.buffer, LEASE_CONTRACT_ALLOWED_MIMES, file.mimetype);
    if (!magic.ok) throw new BadRequestException(magic.reason);
    const mime = magic.mime;
    const ext = LEASE_CONTRACT_MIME_TO_EXT[mime];
    if (!ext) throw new BadRequestException('Extension non reconnue pour ce type MIME.');

    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, ...leaseBelongsToOrg(organizationId) },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');

    const key = `${randomUUID()}${ext}`;
    await this.storage.put('lease-contracts', key, file.buffer, mime);

    const safeOriginal = file.originalname.replace(/[^\w.\-\s()[\]]/g, '_').slice(0, 240) || `contrat${ext}`;
    const uploadedAtIso = new Date().toISOString();

    const current = await this.readContractIndex(leaseId);
    current.push({
      fileKey: key,
      fileName: safeOriginal,
      mimeType: mime,
      size: file.size,
      uploadedAt: uploadedAtIso,
    });
    await this.writeContractIndex(leaseId, current);

    await this.prisma.lease.update({
      where: { id: leaseId },
      data: {
        contractFileKey: key,
        contractFileOriginalName: safeOriginal,
        contractFileMime: mime,
        contractFileSize: file.size,
        contractUploadedAt: new Date(uploadedAtIso),
      },
    });

    await this.audit.log({
      organizationId,
      actor,
      action: 'LEASE_CONTRACT_UPLOADED',
      entityType: 'lease',
      entityId: leaseId,
      summary: `Contrat ajoute: ${safeOriginal}`,
      metadata: { fileKey: key, size: file.size, mimeType: mime },
    });

    return {
      ok: true,
      fileName: safeOriginal,
      mimeType: mime,
      size: file.size,
      uploadedAt: uploadedAtIso,
    };
  }

  async getContractStreamByKey(leaseId: string, organizationId: string, fileKey: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, ...leaseBelongsToOrg(organizationId) },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');
    const list = await this.readContractIndex(leaseId);
    const f = list.find((x) => x.fileKey === fileKey);
    if (!f) throw new NotFoundException('Fichier de contrat introuvable.');
    const buffer = await this.storage.get('lease-contracts', f.fileKey);
    if (!buffer) throw new NotFoundException('Fichier introuvable sur le serveur.');
    const downloadName = f.fileName?.replace(/[^\w.\-\s]/g, '_') || 'contrat-bail';
    return new StreamableFile(buffer, {
      type: f.mimeType,
      disposition: `inline; filename="${encodeURIComponent(downloadName)}"`,
    });
  }

  async getContractStream(leaseId: string, organizationId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, ...leaseBelongsToOrg(organizationId) },
    });
    if (!lease?.contractFileKey || !lease.contractFileMime) {
      throw new NotFoundException('Aucun contrat de bail n’a été enregistré pour ce bail.');
    }
    const buffer = await this.storage.get('lease-contracts', lease.contractFileKey);
    if (!buffer) throw new NotFoundException('Fichier introuvable sur le serveur.');
    const downloadName =
      lease.contractFileOriginalName?.replace(/[^\w.\-\s]/g, '_') || 'contrat-bail';
    return new StreamableFile(buffer, {
      type: lease.contractFileMime,
      disposition: `inline; filename="${encodeURIComponent(downloadName)}"`,
    });
  }

  async removeContract(leaseId: string, organizationId: string, actor?: JwtAuthUser) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, ...leaseBelongsToOrg(organizationId) },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');
    if (!lease.contractFileKey) {
      return { ok: true, removed: false };
    }
    await this.removeContractFileFromDisk(lease.contractFileKey);
    await this.prisma.lease.update({
      where: { id: leaseId },
      data: {
        contractFileKey: null,
        contractFileOriginalName: null,
        contractFileMime: null,
        contractFileSize: null,
        contractUploadedAt: null,
      },
    });
    await this.audit.log({
      organizationId,
      actor,
      action: 'LEASE_CONTRACT_REMOVED',
      entityType: 'lease',
      entityId: leaseId,
      summary: 'Contrat principal supprime',
    });
    return { ok: true, removed: true };
  }

  async removeContractByKey(leaseId: string, organizationId: string, fileKey: string, actor?: JwtAuthUser) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, ...leaseBelongsToOrg(organizationId) },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');
    const list = await this.readContractIndex(leaseId);
    const keep = list.filter((x) => x.fileKey !== fileKey);
    if (keep.length === list.length) return { ok: true, removed: false };
    await this.removeContractFileFromDisk(fileKey);
    await this.writeContractIndex(leaseId, keep);
    await this.audit.log({
      organizationId,
      actor,
      action: 'LEASE_CONTRACT_REMOVED',
      entityType: 'lease',
      entityId: leaseId,
      summary: 'Contrat supprime',
      metadata: { fileKey },
    });
    return { ok: true, removed: true };
  }

  async generatePayments(leaseId: string, organizationId: string, year: number) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, ...leaseBelongsToOrg(organizationId) },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');

    const created: string[] = [];
    for (let mo = 1; mo <= 12; mo++) {
      const due = rentDueDateForBilledPeriod(year, mo, lease.rentDueDay);
      try {
        await this.prisma.payment.create({
          data: {
            leaseId,
            periodYear: year,
            periodMonth: mo,
            amountDue: lease.monthlyRent,
            dueDate: due,
            status: PaymentStatus.PENDING,
          },
        });
        created.push(`${year}-${String(mo).padStart(2, '0')}`);
      } catch {
        /* déjà créé */
      }
    }
    return { leaseId, year, createdCount: created.length, periods: created };
  }

  /**
   * Enregistre le paiement des N prochaines échéances impayées (loyer), dans l’ordre chronologique.
   * Utile quand le locataire paie plusieurs mois d’avance.
   */
  async prepayNextMonths(leaseId: string, organizationId: string, months: number) {
    if (!Number.isInteger(months) || months < 1 || months > 12) {
      throw new BadRequestException('Nombre de mois invalide (indiquer un entier entre 1 et 12).');
    }
    await this.payments.syncLateStatuses(organizationId);
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, ...leaseBelongsToOrg(organizationId) },
    });
    if (!lease) throw new NotFoundException('Bail introuvable');

    const unpaid = await this.prisma.payment.findMany({
      where: {
        leaseId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] },
      },
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      take: months,
    });

    if (unpaid.length < months) {
      throw new BadRequestException(
        `Il n’y a que ${unpaid.length} échéance(s) de loyer encore impayée(s). Générez les loyers pour l’année voulue (page Baux), ou choisissez moins de mois.`,
      );
    }

    const paidAt = new Date();
    const ids: string[] = [];
    for (const p of unpaid) {
      await this.prisma.payment.update({
        where: { id: p.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt,
          amountPaid: p.amountDue,
        },
      });
      ids.push(p.id);
    }

    return {
      leaseId,
      monthsPaid: unpaid.length,
      totalFcfa: unpaid.reduce((s, p) => s + p.amountDue.toNumber(), 0),
      paymentIds: ids,
      periods: unpaid.map((p) => `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`),
    };
  }

  /** PDF imprimable : fiche location (mise en page sobre, prête impression ou archivage). */
  async buildFichePdf(id: string, organizationId: string): Promise<Buffer> {
    const [f, org] = await Promise.all([
      this.getFiche(id, organizationId),
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit') as typeof import('pdfkit');
    const chunks: Buffer[] = [];
    const margin = 48;
    const doc = new PDFDocument({ size: 'A4', margin });
    doc.on('data', (c: Buffer) => chunks.push(c));

    const contentW = doc.page.width - margin * 2;
    const pageH = doc.page.height;
    const pageTop = margin;
    const pageBottom = pageH - margin - 44;

    const orgEyebrow = org?.name?.trim() || 'Organisation';
    const subtitle = [
      `${f.property.buildingName} — ${f.property.unitLabel}`,
      `Référence bail : ${f.leaseId} · ${f.active ? 'Bail actif' : 'Bail inactif'}`,
    ].join('\n');

    drawTopBanner(doc, margin, contentW, {
      eyebrow: orgEyebrow,
      title: 'Fiche de location',
      subtitle,
    });

    const locLine =
      f.localization.shortLabel?.trim() ||
      [f.localization.commune, f.localization.city].filter(Boolean).join(', ') ||
      '—';
    const addrParts = [f.localization.address, f.localization.postalCode].filter((s) => s?.trim());
    const fullAddr = addrParts.length ? addrParts.join(' · ') : null;

    drawSectionHeading(doc, margin, contentW, 'Localisation du bien', '1');
    drawField(doc, margin, contentW, 'Commune & ville', locLine);
    if (fullAddr) drawField(doc, margin, contentW, 'Adresse postale', fullAddr);
    drawField(doc, margin, contentW, 'Pays', f.localization.country || '—');

    const bits: string[] = [unitKindFr(String(f.property.kind))];
    if (f.property.surfaceM2 != null) bits.push(`${f.property.surfaceM2} m²`);
    if (f.property.rooms != null) bits.push(`${f.property.rooms} pièce(s)`);
    if (f.property.floor != null) bits.push(f.property.floor === 0 ? 'Rez-de-chaussée' : `Étage ${f.property.floor}`);
    drawSectionHeading(doc, margin, contentW, 'Caractéristiques du logement', '2');
    drawField(doc, margin, contentW, 'Synthèse', bits.join(' · ') || '—');
    const desc = [f.property.description, f.property.notes].filter((s) => s?.trim()).join('\n\n') || '';
    if (desc) drawField(doc, margin, contentW, 'Description & remarques', desc);

    drawSectionHeading(doc, margin, contentW, 'Occupant (locataire)', '3');
    drawField(doc, margin, contentW, 'Identité', f.tenant.fullName);
    if (f.tenant.phone?.trim()) drawField(doc, margin, contentW, 'Téléphone', f.tenant.phone);
    if (f.tenant.email?.trim()) drawField(doc, margin, contentW, 'Adresse e-mail', f.tenant.email);

    drawSectionHeading(doc, margin, contentW, 'Conditions financières & bail', '4');
    drawField(doc, margin, contentW, 'Loyer mensuel hors charges', formatFcfaPdf(f.financial.monthlyRent));
    drawField(doc, margin, contentW, 'Jour d’échéance chaque mois', `Le ${f.financial.rentDueDay}`);
    drawField(
      doc,
      margin,
      contentW,
      'Dates de prise d’effet et de fin du bail',
      `${fmtDateFr(f.startDate)} - ${f.endDate ? fmtDateFr(f.endDate) : 'Sans date de fin (tacite reconduction possible selon contrat)'}`,
    );
    drawField(doc, margin, contentW, 'État du bail', f.active ? 'Actif' : 'Inactif');
    if (f.financial.depositAmount != null && f.financial.depositAmount > 0) {
      const dep = `${formatFcfaPdf(f.financial.depositAmount)} (${f.financial.depositPaidAt ? 'dépôt encaissé' : 'dépôt non encaissé'})`;
      drawField(doc, margin, contentW, 'Dépôt de garantie (caution)', dep);
    }
    drawField(
      doc,
      margin,
      contentW,
      'Loyer — mois en cours (situation à la génération)',
      f.financial.currentPaymentStatusFr,
    );

    const schedule = (f.paymentSchedule ?? []).slice(0, 48).map((p) => ({
      periodYear: p.periodYear,
      periodMonth: p.periodMonth,
      dueDate: p.dueDate,
      amountDue: p.amountDue,
      amountPaid: p.amountPaid,
      statusFr: p.statusFr,
    }));

    drawSectionHeading(doc, margin, contentW, 'Historique des échéances (extraits)', '5');
    const yTable = doc.y;
    if (schedule.length > 0) {
      drawScheduleTable(doc, margin, contentW, pageTop, pageBottom, schedule, formatFcfaPdf, yTable);
    } else {
      doc.fillColor('#64748b').font('Helvetica').fontSize(9).text('Aucune échéance enregistrée pour ce bail.', margin, yTable, {
        width: contentW,
      });
      doc.moveDown(1);
    }

    drawFooter(doc, margin, contentW, pageH);

    doc.end();
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }

  private async ensure(id: string, organizationId: string) {
    const n = await this.prisma.lease.count({ where: { id, ...leaseBelongsToOrg(organizationId) } });
    if (!n) throw new NotFoundException('Bail introuvable');
  }
}
