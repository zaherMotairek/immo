import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import type { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { rentDueDate } from '../common/date.util';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import {
  LEASE_CONTRACT_ALLOWED_MIMES,
  LEASE_CONTRACT_MAX_BYTES,
  LEASE_CONTRACT_MIME_TO_EXT,
} from './lease-contract.constants';

function paymentStatusFr(s: PaymentStatus | undefined): string {
  if (!s) return '—';
  switch (s) {
    case PaymentStatus.PAID:
      return 'Payé';
    case PaymentStatus.LATE:
      return 'En retard';
    case PaymentStatus.CANCELLED:
      return 'Annulé';
    default:
      return 'Impayé';
  }
}

@Injectable()
export class LeasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  list() {
    return this.prisma.lease.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        tenant: true,
        unit: { include: { building: true } },
      },
    });
  }

  /** Liste synthétique pour cartes « locations » (tableau de bord métier). */
  async listOverview(activeOnly = true) {
    await this.payments.syncLateStatuses();
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    const leases = await this.prisma.lease.findMany({
      where: activeOnly ? { active: true } : {},
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

  async listDepositsCollected() {
    const leases = await this.prisma.lease.findMany({
      where: {
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

  async getFiche(id: string) {
    await this.payments.syncLateStatuses();
    const l = await this.prisma.lease.findUnique({
      where: { id },
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
    };
  }

  async get(id: string) {
    const l = await this.prisma.lease.findUnique({
      where: { id },
      include: {
        tenant: true,
        unit: { include: { building: true } },
        payments: { orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }] },
      },
    });
    if (!l) throw new NotFoundException('Bail introuvable');
    return l;
  }

  async create(dto: CreateLeaseDto) {
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

    return this.prisma.lease.create({
      data: {
        unitId: dto.unitId,
        tenantId: dto.tenantId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        monthlyRent: dto.monthlyRent,
        depositAmount: deposit ?? null,
        rentDueDay: dto.rentDueDay ?? 1,
        active: dto.active ?? true,
      },
      include: { tenant: true, unit: { include: { building: true } } },
    });
  }

  async update(id: string, dto: UpdateLeaseDto) {
    await this.ensure(id);
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
    const updated = await this.prisma.lease.update({
      where: { id },
      data,
      include: { tenant: true, unit: { include: { building: true } } },
    });
    /** Aligner les échéances non soldées sur le nouveau loyer (contrat renégocié). */
    if (dto.monthlyRent !== undefined) {
      await this.prisma.payment.updateMany({
        where: {
          leaseId: id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] },
        },
        data: { amountDue: dto.monthlyRent },
      });
    }
    return updated;
  }

  async remove(id: string) {
    const lease = await this.prisma.lease.findUnique({ where: { id } });
    if (!lease) throw new NotFoundException('Bail introuvable');
    await this.removeContractFileFromDisk(lease.contractFileKey);
    await this.prisma.lease.delete({ where: { id } });
    return { ok: true };
  }

  private contractUploadDir(): string {
    const root = process.env.LEASE_CONTRACT_UPLOAD_SUBDIR || 'uploads';
    return join(process.cwd(), root, 'lease-contracts');
  }

  private async removeContractFileFromDisk(key: string | null | undefined) {
    if (!key) return;
    const full = join(this.contractUploadDir(), key);
    try {
      await unlink(full);
    } catch {
      /* ignoré */
    }
  }

  async saveContract(leaseId: string, file: Express.Multer.File) {
    if (!LEASE_CONTRACT_ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        'Format non accepté. Utilisez un PDF ou une image (JPEG, PNG, WebP).',
      );
    }
    if (file.size > LEASE_CONTRACT_MAX_BYTES) {
      throw new BadRequestException('Fichier trop volumineux (15 Mo maximum).');
    }
    const ext = LEASE_CONTRACT_MIME_TO_EXT[file.mimetype];
    if (!ext) throw new BadRequestException('Extension non reconnue pour ce type MIME.');

    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease) throw new NotFoundException('Bail introuvable');

    const dir = this.contractUploadDir();
    await mkdir(dir, { recursive: true });
    const key = `${randomUUID()}${ext}`;
    const fullPath = join(dir, key);
    await writeFile(fullPath, file.buffer);

    if (lease.contractFileKey) await this.removeContractFileFromDisk(lease.contractFileKey);

    const safeOriginal = file.originalname.replace(/[^\w.\-\s()[\]]/g, '_').slice(0, 240) || `contrat${ext}`;

    await this.prisma.lease.update({
      where: { id: leaseId },
      data: {
        contractFileKey: key,
        contractFileOriginalName: safeOriginal,
        contractFileMime: file.mimetype,
        contractFileSize: file.size,
        contractUploadedAt: new Date(),
      },
    });

    return {
      ok: true,
      fileName: safeOriginal,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
  }

  async getContractStream(leaseId: string) {
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease?.contractFileKey || !lease.contractFileMime) {
      throw new NotFoundException('Aucun contrat de bail n’a été enregistré pour ce bail.');
    }
    const fullPath = join(this.contractUploadDir(), lease.contractFileKey);
    const stream = createReadStream(fullPath);
    const downloadName =
      lease.contractFileOriginalName?.replace(/[^\w.\-\s]/g, '_') || 'contrat-bail';
    return new StreamableFile(stream, {
      type: lease.contractFileMime,
      disposition: `inline; filename="${encodeURIComponent(downloadName)}"`,
    });
  }

  async removeContract(leaseId: string) {
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId } });
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
    return { ok: true, removed: true };
  }

  async generatePayments(leaseId: string, year: number) {
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease) throw new NotFoundException('Bail introuvable');

    const created: string[] = [];
    for (let mo = 1; mo <= 12; mo++) {
      const due = rentDueDate(year, mo, lease.rentDueDay);
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
  async prepayNextMonths(leaseId: string, months: number) {
    if (!Number.isInteger(months) || months < 1 || months > 12) {
      throw new BadRequestException('Nombre de mois invalide (indiquer un entier entre 1 et 12).');
    }
    await this.payments.syncLateStatuses();
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId } });
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

  private async ensure(id: string) {
    const n = await this.prisma.lease.count({ where: { id } });
    if (!n) throw new NotFoundException('Bail introuvable');
  }
}
