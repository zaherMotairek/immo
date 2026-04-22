import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BuildingStructureKind,
  ChargeCategory,
  PaymentStatus,
  UnitKind,
} from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { BuildingsService } from '../buildings/buildings.service';
import { UnitsService } from '../units/units.service';
import { LeasesService } from '../leases/leases.service';
import { PaymentsService } from '../payments/payments.service';
import { ChargesService } from '../charges/charges.service';
import { addOneYearSameDay, rentDueDateForBilledPeriod } from '../common/date.util';

export type ExcelImportResult = {
  buildingsCreated: number;
  unitsCreated: number;
  tenantsCreated: number;
  leasesCreated: number;
  leasesUpdated: number;
  paymentsUpserted: number;
  chargesCreated: number;
  errors: string[];
  warnings: string[];
};

const UNIT_FR: Record<string, UnitKind> = {
  Appartement: UnitKind.APARTMENT,
  Maison: UnitKind.HOUSE,
  Terrain: UnitKind.LAND,
  Bureau: UnitKind.OFFICE,
  Entrepôt: UnitKind.WAREHOUSE,
  'Local commercial': UnitKind.COMMERCIAL,
  'Garage / parking': UnitKind.GARAGE,
  'Garage (parking)': UnitKind.GARAGE,
  Autre: UnitKind.OTHER,
};

const CHARGE_CAT_FR: Record<string, ChargeCategory> = {
  'Impôts / taxes': ChargeCategory.TAX,
  'Impôts et taxes': ChargeCategory.TAX,
  'Copro / honoraires': ChargeCategory.FEES,
  'Copro et honoraires': ChargeCategory.FEES,
  Assurance: ChargeCategory.INSURANCE,
  'Entretien / travaux': ChargeCategory.MAINTENANCE,
  'Entretien et travaux': ChargeCategory.MAINTENANCE,
  'Eau / énergie': ChargeCategory.UTILITIES,
  'Eau et énergie': ChargeCategory.UTILITIES,
  'Sécurité / gardiennage': ChargeCategory.SECURITY,
  'Sécurité et gardiennage': ChargeCategory.SECURITY,
  'Salaires & personnel': ChargeCategory.PAYROLL,
  'Salaires et personnel': ChargeCategory.PAYROLL,
  Autre: ChargeCategory.OTHER,
};

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + Math.round(v) * 86400000);
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function statusFrToEnum(s: string): PaymentStatus {
  const t = s.trim();
  if (t === 'Payé') return PaymentStatus.PAID;
  if (t === 'En retard') return PaymentStatus.LATE;
  if (t === 'Annulé') return PaymentStatus.CANCELLED;
  if (t === 'Loyer offert') return PaymentStatus.WAIVED;
  if (t === 'Impayé' || t === '—' || t === '') return PaymentStatus.PENDING;
  return PaymentStatus.PENDING;
}

@Injectable()
export class ExcelImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buildings: BuildingsService,
    private readonly units: UnitsService,
    private readonly leases: LeasesService,
    private readonly payments: PaymentsService,
    private readonly charges: ChargesService,
  ) {}

  async importFromBuffer(buffer: Buffer, organizationId: string): Promise<ExcelImportResult> {
    const result: ExcelImportResult = {
      buildingsCreated: 0,
      unitsCreated: 0,
      tenantsCreated: 0,
      leasesCreated: 0,
      leasesUpdated: 0,
      paymentsUpserted: 0,
      chargesCreated: 0,
      errors: [],
      warnings: [],
    };
    const pushErr = (msg: string) => {
      if (result.errors.length < 80) result.errors.push(msg);
    };
    const pushWarn = (msg: string) => {
      if (result.warnings.length < 80) result.warnings.push(msg);
    };

    let wb: ExcelJS.Workbook;
    try {
      wb = new ExcelJS.Workbook();
      // exceljs typings attendent Buffer Node ; Multer fournit un Buffer compatible.
      await wb.xlsx.load(buffer as never);
    } catch {
      throw new BadRequestException('Fichier Excel illisible ou corrompu.');
    }

    await this.payments.syncLateStatuses();

    await this.importBiens(wb, organizationId, result, pushErr);
    await this.importBaux(wb, organizationId, result, pushErr, pushWarn);
    await this.importLocatairesSansBien(wb, organizationId, result, pushErr);
    await this.importPaiements(wb, organizationId, result, pushErr, pushWarn);
    await this.importCharges(wb, organizationId, result, pushErr);

    const totalImported =
      result.buildingsCreated +
      result.unitsCreated +
      result.tenantsCreated +
      result.leasesCreated +
      result.leasesUpdated +
      result.paymentsUpserted +
      result.chargesCreated;
    if (totalImported === 0 && result.errors.length > 0) {
      throw new BadRequestException({
        message: 'Import impossible : vérifiez les feuilles et les en-têtes (même modèle que l’export ImmoPilot).',
        errors: result.errors,
      });
    }

    return result;
  }

  private async importBiens(
    wb: ExcelJS.Workbook,
    organizationId: string,
    result: ExcelImportResult,
    pushErr: (s: string) => void,
  ) {
    const ws = wb.getWorksheet('Biens');
    if (!ws) return;
    let rowNum = 2;
    for (; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      const name = str(row.getCell(1).value);
      if (!name) continue;
      const city = str(row.getCell(2).value);
      const commune = str(row.getCell(3).value);
      if (!city || !commune) {
        pushErr(`Biens ligne ${rowNum} : ville et commune obligatoires pour « ${name} ».`);
        continue;
      }
      const address = str(row.getCell(4).value) || undefined;
      const existing = await this.prisma.building.findFirst({
        where: { organizationId, name, city, commune },
      });
      if (existing) {
        if (address && address !== (existing.address ?? '')) {
          await this.prisma.building.update({
            where: { id: existing.id },
            data: { address },
          });
        }
        continue;
      }
      try {
        await this.buildings.create(
          {
            name,
            city,
            commune,
            address,
            structureKind: BuildingStructureKind.IMMEUBLE,
          },
          organizationId,
        );
        result.buildingsCreated += 1;
      } catch (e) {
        pushErr(`Biens ligne ${rowNum} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  private async ensureBuildingImmeuble(buildingId: string) {
    const b = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (b?.structureKind === BuildingStructureKind.MONO_LOT) {
      await this.prisma.building.update({
        where: { id: buildingId },
        data: { structureKind: BuildingStructureKind.IMMEUBLE },
      });
    }
  }

  private async findOrCreateBuilding(
    organizationId: string,
    name: string,
    city: string,
    commune: string,
    address?: string,
    result?: ExcelImportResult,
  ) {
    let b = await this.prisma.building.findFirst({
      where: { organizationId, name, city, commune },
    });
    if (b) return b;
    b = await this.buildings.create(
      {
        name,
        city,
        commune,
        address: address || undefined,
        structureKind: BuildingStructureKind.IMMEUBLE,
      },
      organizationId,
    );
    if (result) result.buildingsCreated += 1;
    return b;
  }

  private async findOrCreateUnit(
    organizationId: string,
    buildingId: string,
    label: string,
    kindFr: string,
    result: ExcelImportResult,
    pushErr: (s: string) => void,
    ctx: string,
  ) {
    const kind = UNIT_FR[kindFr.trim()] ?? UnitKind.APARTMENT;
    let u = await this.prisma.unit.findFirst({
      where: { buildingId, label: label.trim() },
    });
    if (u) return u;
    await this.ensureBuildingImmeuble(buildingId);
    try {
      u = await this.units.create(
        buildingId,
        { label: label.trim(), kind },
        organizationId,
      );
      result.unitsCreated += 1;
      return u;
    } catch (e) {
      pushErr(`${ctx} : ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  private async findOrCreateTenant(
    organizationId: string,
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    notes: string,
    result: ExcelImportResult,
  ) {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim();
    const ph = phone.trim();

    if (em) {
      const byEmail = await this.prisma.tenant.findFirst({
        where: { organizationId, email: em },
      });
      if (byEmail) return byEmail;
    }
    const byName = await this.prisma.tenant.findFirst({
      where: {
        organizationId,
        firstName: fn,
        lastName: ln,
        ...(ph ? { phone: ph } : {}),
      },
    });
    if (byName) return byName;

    const emailOk = em && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) ? em : null;
    const t = await this.prisma.tenant.create({
      data: {
        organizationId,
        firstName: fn,
        lastName: ln,
        email: emailOk,
        phone: ph || null,
        notes: notes.trim() || null,
      },
    });
    result.tenantsCreated += 1;
    return t;
  }

  private async importBaux(
    wb: ExcelJS.Workbook,
    organizationId: string,
    result: ExcelImportResult,
    pushErr: (s: string) => void,
    pushWarn: (s: string) => void,
  ) {
    const ws = wb.getWorksheet('Baux');
    if (!ws) {
      pushWarn('Feuille « Baux » absente : aucun bail importé depuis cette feuille.');
      return;
    }
    for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      const lastName = str(row.getCell(2).value);
      const firstName = str(row.getCell(3).value);
      const bien = str(row.getCell(6).value);
      const ville = str(row.getCell(7).value);
      const commune = str(row.getCell(8).value);
      const unitLabel = str(row.getCell(9).value);
      const typeUnit = str(row.getCell(10).value) || 'Appartement';
      const rent = num(row.getCell(11).value);
      const deposit = num(row.getCell(12).value);
      const rentDay = num(row.getCell(13).value);
      const start = parseDate(row.getCell(14).value);
      const end = parseDate(row.getCell(15).value);
      const activeStr = str(row.getCell(1).value).toLowerCase();

      if (!lastName || !firstName || !bien || !ville || !commune || !unitLabel) continue;
      if (rent == null || rent < 0 || !start) {
        pushErr(`Baux ligne ${rowNum} : loyer mensuel et date de début obligatoires.`);
        continue;
      }

      const building = await this.findOrCreateBuilding(organizationId, bien, ville, commune, undefined, result);
      const unit = await this.findOrCreateUnit(
        organizationId,
        building.id,
        unitLabel,
        typeUnit,
        result,
        pushErr,
        `Baux ligne ${rowNum}`,
      );
      if (!unit) continue;

      const email = str(row.getCell(4).value);
      const phone = str(row.getCell(5).value);
      const tenant = await this.findOrCreateTenant(organizationId, firstName, lastName, email, phone, '', result);

      const active = activeStr !== 'non' && activeStr !== '0' && activeStr !== 'false';

      const existingLease = await this.prisma.lease.findFirst({
        where: { unitId: unit.id, active: true },
        include: { tenant: true },
      });
      if (existingLease) {
        if (existingLease.tenantId !== tenant.id) {
          pushErr(
            `Baux ligne ${rowNum} : l’unité « ${unitLabel} » a déjà un bail actif (autre locataire).`,
          );
          continue;
        }
        await this.prisma.lease.update({
          where: { id: existingLease.id },
          data: {
            monthlyRent: rent,
            depositAmount: deposit != null && deposit > 0 ? deposit : null,
            rentDueDay: rentDay != null && rentDay >= 1 && rentDay <= 31 ? Math.floor(rentDay) : existingLease.rentDueDay,
            startDate: start,
            endDate: end ?? existingLease.endDate,
            active,
          },
        });
        result.leasesUpdated += 1;
        continue;
      }

      const endOrYear = end ?? addOneYearSameDay(start);
      try {
        await this.leases.create(
          {
            unitId: unit.id,
            tenantId: tenant.id,
            startDate: start.toISOString().slice(0, 10),
            endDate: endOrYear.toISOString().slice(0, 10),
            monthlyRent: rent,
            depositAmount: deposit != null && deposit > 0 ? deposit : undefined,
            rentDueDay:
              rentDay != null && rentDay >= 1 && rentDay <= 31 ? Math.floor(rentDay) : 1,
            active,
          },
          organizationId,
        );
        result.leasesCreated += 1;
      } catch (e) {
        pushErr(`Baux ligne ${rowNum} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  /** Locataires sans ligne « Bien » : création contact seul. */
  private async importLocatairesSansBien(
    wb: ExcelJS.Workbook,
    organizationId: string,
    result: ExcelImportResult,
    pushErr: (s: string) => void,
  ) {
    const ws = wb.getWorksheet('Locataires');
    if (!ws) return;
    for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      const lastName = str(row.getCell(1).value);
      const firstName = str(row.getCell(2).value);
      const bien = str(row.getCell(6).value);
      if (!lastName || !firstName || bien) continue;
      const email = str(row.getCell(3).value);
      const phone = str(row.getCell(4).value);
      const notes = str(row.getCell(5).value);
      try {
        await this.findOrCreateTenant(organizationId, firstName, lastName, email, phone, notes, result);
      } catch (e) {
        pushErr(`Locataires ligne ${rowNum} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  private async importPaiements(
    wb: ExcelJS.Workbook,
    organizationId: string,
    result: ExcelImportResult,
    pushErr: (s: string) => void,
    pushWarn: (s: string) => void,
  ) {
    const ws = wb.getWorksheet('Paiements');
    if (!ws) {
      pushWarn('Feuille « Paiements » absente : aucune échéance mise à jour.');
      return;
    }
    for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      const periodStr = str(row.getCell(1).value);
      const dueDate = parseDate(row.getCell(2).value);
      const statusFr = str(row.getCell(3).value);
      const amountDue = num(row.getCell(4).value);
      const paidAt = parseDate(row.getCell(5).value);
      const amountPaid = num(row.getCell(6).value);
      const locataireNom = str(row.getCell(7).value);
      const email = str(row.getCell(8).value);
      const unitLabel = str(row.getCell(10).value);
      const bien = str(row.getCell(11).value);
      const ville = str(row.getCell(12).value);

      if (!periodStr || amountDue == null) continue;

      const m = /^(\d{4})-(\d{2})$/.exec(periodStr.trim());
      if (!m) {
        pushErr(`Paiements ligne ${rowNum} : période invalide « ${periodStr} » (attendu AAAA-MM).`);
        continue;
      }
      const periodYear = parseInt(m[1]!, 10);
      const periodMonth = parseInt(m[2]!, 10);

      const lease = await this.findLeaseForPaymentRow(
        organizationId,
        email,
        locataireNom,
        unitLabel,
        bien,
        ville,
      );
      if (!lease) {
        pushErr(
          `Paiements ligne ${rowNum} : bail introuvable (vérifiez locataire, e-mail, unité, bien, ville).`,
        );
        continue;
      }

      const status = statusFrToEnum(statusFr);
      const due =
        dueDate ?? rentDueDateForBilledPeriod(periodYear, periodMonth, lease.rentDueDay);

      try {
        await this.prisma.payment.upsert({
          where: {
            leaseId_periodYear_periodMonth: {
              leaseId: lease.id,
              periodYear,
              periodMonth,
            },
          },
          create: {
            leaseId: lease.id,
            periodYear,
            periodMonth,
            amountDue,
            dueDate: due,
            status,
            paidAt: paidAt ?? null,
            amountPaid: amountPaid != null ? amountPaid : null,
            waiveReason: status === PaymentStatus.WAIVED ? 'Import Excel' : null,
            waivedAt: status === PaymentStatus.WAIVED ? new Date() : null,
          },
          update: {
            amountDue,
            dueDate: due,
            status,
            paidAt: paidAt ?? null,
            amountPaid: amountPaid != null ? amountPaid : null,
            ...(status === PaymentStatus.WAIVED
              ? { waiveReason: 'Import Excel', waivedAt: new Date() }
              : { waiveReason: null, waivedAt: null }),
          },
        });
        result.paymentsUpserted += 1;
      } catch (e) {
        pushErr(`Paiements ligne ${rowNum} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  private async findLeaseForPaymentRow(
    organizationId: string,
    email: string,
    fullName: string,
    unitLabel: string,
    buildingName: string,
    city: string,
  ) {
    const base = {
      active: true,
      unit: {
        label: unitLabel.trim(),
        building: {
          organizationId,
          name: buildingName.trim(),
          city: city.trim(),
        },
      },
    } as const;

    if (email.trim()) {
      const lease = await this.prisma.lease.findFirst({
        where: {
          ...base,
          tenant: { organizationId, email: email.trim() },
        },
      });
      if (lease) return lease;
    }

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const fn = parts[0]!;
      const ln = parts.slice(1).join(' ');
      const lease = await this.prisma.lease.findFirst({
        where: {
          ...base,
          tenant: { organizationId, firstName: fn, lastName: ln },
        },
      });
      if (lease) return lease;
    }

    return this.prisma.lease.findFirst({ where: base });
  }

  private async importCharges(
    wb: ExcelJS.Workbook,
    organizationId: string,
    result: ExcelImportResult,
    pushErr: (s: string) => void,
  ) {
    const ws = wb.getWorksheet('Charges');
    if (!ws) return;
    for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      const catFr = str(row.getCell(1).value);
      const label = str(row.getCell(2).value);
      const amount = num(row.getCell(3).value);
      const year = num(row.getCell(4).value);
      const month = num(row.getCell(5).value);
      const paidStr = str(row.getCell(6).value).toLowerCase();
      const bien = str(row.getCell(7).value);
      const unitLabel = str(row.getCell(8).value);
      const notes = str(row.getCell(9).value);

      if (!label || amount == null || year == null || !bien) continue;

      const category = CHARGE_CAT_FR[catFr] ?? ChargeCategory.OTHER;
      const building = await this.prisma.building.findFirst({
        where: { organizationId, name: bien },
      });
      if (!building) {
        pushErr(`Charges ligne ${rowNum} : bien « ${bien} » introuvable (importez l’onglet Biens ou Baux d’abord).`);
        continue;
      }

      let unitId: string | undefined;
      if (unitLabel) {
        const u = await this.prisma.unit.findFirst({
          where: { buildingId: building.id, label: unitLabel.trim() },
        });
        unitId = u?.id;
      }

      try {
        await this.charges.create(
          {
            buildingId: building.id,
            unitId,
            category,
            label,
            amount,
            periodYear: Math.floor(year),
            periodMonth:
              month != null && month >= 1 && month <= 12 ? Math.floor(month) : undefined,
            paid: paidStr === 'oui' || paidStr === 'yes' || paidStr === '1',
            notes: notes || undefined,
          },
          organizationId,
        );
        result.chargesCreated += 1;
      } catch (e) {
        pushErr(`Charges ligne ${rowNum} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}
