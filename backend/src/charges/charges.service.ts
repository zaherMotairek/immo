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

  list(year?: number, month: ChargeListMonth = 'all') {
    const where: { periodYear?: number; periodMonth?: number } = {};
    if (year != null) where.periodYear = year;
    if (month !== 'all' && Number.isInteger(month) && month >= 1 && month <= 12) {
      where.periodMonth = month;
    }
    const hasFilter = Object.keys(where).length > 0;
    return this.prisma.charge.findMany({
      where: hasFilter ? where : {},
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { createdAt: 'desc' }],
      include: {
        building: true,
        unit: true,
      },
    });
  }

  async summary(year: number, month: ChargeListMonth = 'all') {
    const where: { periodYear: number; periodMonth?: number } = { periodYear: year };
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

  async get(id: string) {
    const c = await this.prisma.charge.findUnique({
      where: { id },
      include: { building: true, unit: true },
    });
    if (!c) throw new NotFoundException('Charge introuvable');
    return c;
  }

  async create(dto: CreateChargeDto) {
    await this.ensureBuilding(dto.buildingId);
    if (dto.unitId) await this.ensureUnitInBuilding(dto.unitId, dto.buildingId);
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

  async update(id: string, dto: UpdateChargeDto) {
    await this.ensure(id);
    if (dto.buildingId) await this.ensureBuilding(dto.buildingId);
    if (dto.unitId && dto.buildingId) await this.ensureUnitInBuilding(dto.unitId, dto.buildingId);
    return this.prisma.charge.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.category != null ? { category: dto.category as ChargeCategory } : {}),
      },
      include: { building: true, unit: true },
    });
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.charge.delete({ where: { id } });
    return { ok: true };
  }

  private async ensure(id: string) {
    const n = await this.prisma.charge.count({ where: { id } });
    if (!n) throw new NotFoundException('Charge introuvable');
  }

  private async ensureBuilding(id: string) {
    const n = await this.prisma.building.count({ where: { id } });
    if (!n) throw new NotFoundException('Bien introuvable');
  }

  private async ensureUnitInBuilding(unitId: string, buildingId: string) {
    const u = await this.prisma.unit.findFirst({ where: { id: unitId, buildingId } });
    if (!u) throw new NotFoundException('Unité introuvable pour ce bien');
  }
}
