import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async global(qRaw: string) {
    const q = qRaw.trim();
    if (q.length < 2) {
      return {
        buildings: [] as const,
        tenants: [] as const,
        units: [] as const,
        leases: [] as const,
        charges: [] as const,
        payments: [] as const,
      };
    }

    const ic = { contains: q, mode: 'insensitive' as const };

    const [buildings, tenants, units, leases, charges, payments] = await Promise.all([
      this.prisma.building.findMany({
        where: {
          OR: [{ name: ic }, { city: ic }, { commune: ic }, { address: ic }],
        },
        orderBy: { name: 'asc' },
        take: 12,
        select: { id: true, name: true, city: true, commune: true },
      }),
      this.prisma.tenant.findMany({
        where: {
          OR: [{ firstName: ic }, { lastName: ic }, { email: ic }, { phone: ic }],
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 12,
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      }),
      this.prisma.unit.findMany({
        where: {
          OR: [{ label: ic }, { description: ic }],
        },
        orderBy: { label: 'asc' },
        take: 12,
        select: {
          id: true,
          label: true,
          kind: true,
          buildingId: true,
          building: { select: { name: true, city: true } },
        },
      }),
      this.prisma.lease.findMany({
        where: {
          OR: [
            { tenant: { firstName: ic } },
            { tenant: { lastName: ic } },
            { unit: { label: ic } },
            { unit: { building: { name: ic } } },
          ],
        },
        orderBy: { startDate: 'desc' },
        take: 12,
        select: {
          id: true,
          active: true,
          tenant: { select: { firstName: true, lastName: true } },
          unit: {
            select: { label: true, building: { select: { name: true, city: true } } },
          },
        },
      }),
      this.prisma.charge.findMany({
        where: {
          OR: [{ label: ic }, { notes: ic }],
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        take: 10,
        select: {
          id: true,
          label: true,
          amount: true,
          periodYear: true,
          periodMonth: true,
          building: { select: { name: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          OR: [
            { notes: ic },
            { lease: { tenant: { firstName: ic } } },
            { lease: { tenant: { lastName: ic } } },
            { lease: { unit: { label: ic } } },
            { lease: { unit: { building: { name: ic } } } },
            { lease: { unit: { building: { city: ic } } } },
          ],
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        take: 10,
        select: {
          id: true,
          periodYear: true,
          periodMonth: true,
          status: true,
          amountDue: true,
          lease: {
            select: {
              id: true,
              tenant: { select: { firstName: true, lastName: true } },
              unit: {
                select: {
                  label: true,
                  building: { select: { name: true, city: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return { buildings, tenants, units, leases, charges, payments };
  }
}
