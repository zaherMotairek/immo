import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';

@Injectable()
export class ChargesService {
  constructor(private readonly prisma: PrismaService) {}

  list(year?: number) {
    const where = year ? { periodYear: year } : {};
    return this.prisma.charge.findMany({
      where,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { createdAt: 'desc' }],
      include: {
        building: true,
        unit: true,
      },
    });
  }

  async summary(year: number) {
    const rows = await this.prisma.charge.findMany({
      where: { periodYear: year },
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
    return {
      year,
      totalCharges: total,
      unpaidCharges: unpaid,
      byCategory,
      highlights: {
        impotsEtTaxes: taxTotal,
        chargesCoproEtHonoraires: feesTotal,
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
        category: dto.category,
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
      data: dto,
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
