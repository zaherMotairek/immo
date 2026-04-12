import { Injectable, NotFoundException } from '@nestjs/common';
import type { ChargeCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';

/** `month` : 1–12 = filtre ce mois pour l’année donnée ; `'all'` = toute l’année (y compris charges sans mois). */
export type ChargeListMonth = number | 'all';

@Injectable()
export class ChargesService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, year?: number, month: ChargeListMonth = 'all') {
    const where: Record<string, unknown> = { building: { organizationId } };
    if (year != null) where.periodYear = year;
    if (month !== 'all' && Number.isInteger(month) && month >= 1 && month <= 12) {
      where.periodMonth = month;
    }
    return this.prisma.charge.findMany({
      where,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { createdAt: 'desc' }],
      include: {
        building: true,
        unit: true,
      },
    });
  }

  async summary(organizationId: string, year: number, month: ChargeListMonth = 'all') {
    const where: Record<string, unknown> = {
      periodYear: year,
      building: { organizationId },
    };
    if (month !== 'all' && Number.isInteger(month) && month >= 1 && month <= 12) {
      where.periodMonth = month;
    }
    const rows = await this.prisma.charge.findMany({
      where,
      select: { category: true, amount: true, paid: true },
    });
    const byCategory: Record<string, number> = {};
    let total = 0;
    let unpaid = 0;
    for (const r of rows) {
      const a = r.amount.toNumber();
      total += a;
      if (!r.paid) unpaid += a;
      byCategory[r.category] = (byCategory[r.category] || 0) + a;
    }
    const taxTotal = byCategory['TAX'] || 0;
    const feesTotal = byCategory['FEES'] || 0;
    const securiteTotal = byCategory['SECURITY'] || 0;
    const personnelTotal = byCategory['PAYROLL'] || 0;
    return {
      year,
      month: month === 'all' ? null : month,
      scope: month === 'all' ? ('year' as const) : ('month' as const),
      totalCharges: total,
      unpaidCharges: unpaid,
      byCategory,
      highlights: {
        impotsEtTaxes: taxTotal,
        chargesCoproEtHonoraires: feesTotal,
        securite: securiteTotal,
        personnel: personnelTotal,
      },
    };
  }

  async get(id: string, organizationId: string) {
    const c = await this.prisma.charge.findFirst({
      where: { id, building: { organizationId } },
      include: { building: true, unit: true },
    });
    if (!c) throw new NotFoundException('Charge introuvable');
    return c;
  }

  async create(dto: CreateChargeDto, organizationId: string) {
    await this.ensureBuilding(dto.buildingId, organizationId);
    if (dto.unitId) await this.ensureUnitInBuilding(dto.unitId, dto.buildingId, organizationId);
    return this.prisma.charge.create({
      data: {
        buildingId: dto.buildingId,
        unitId: dto.unitId,
        category: dto.category as ChargeCategory,
        label: dto.label,
        amount: dto.amount,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
        paid: dto.paid ?? false,
        notes: dto.notes,
      },
      include: { building: true, unit: true },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateChargeDto) {
    await this.ensure(id, organizationId);
    if (dto.buildingId) await this.ensureBuilding(dto.buildingId, organizationId);
    if (dto.unitId && dto.buildingId) await this.ensureUnitInBuilding(dto.unitId, dto.buildingId, organizationId);
    return this.prisma.charge.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.category != null ? { category: dto.category as ChargeCategory } : {}),
      },
      include: { building: true, unit: true },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.ensure(id, organizationId);
    await this.prisma.charge.delete({ where: { id } });
    return { ok: true };
  }

  private async ensure(id: string, organizationId: string) {
    const n = await this.prisma.charge.count({ where: { id, building: { organizationId } } });
    if (!n) throw new NotFoundException('Charge introuvable');
  }

  private async ensureBuilding(id: string, organizationId: string) {
    const n = await this.prisma.building.count({ where: { id, organizationId } });
    if (!n) throw new NotFoundException('Bien introuvable');
  }

  private async ensureUnitInBuilding(unitId: string, buildingId: string, organizationId: string) {
    const u = await this.prisma.unit.findFirst({
      where: { id: unitId, buildingId, building: { organizationId } },
    });
    if (!u) throw new NotFoundException('Unité introuvable pour ce bien');
  }
}
