import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  BuildingStructureKind,
  PaymentStatus,
  UnitKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { rentDueDateForBilledPeriod, startOfTodayUtc } from '../common/date.util';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Crée une org sandbox isolée + JWT session (D4). */
  async startSession(visitorKey: string) {
    const tag = randomUUID().slice(0, 8);
    const email = `demo+${tag}@immopilot.local`;
    const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 8);
    const year = new Date().getUTCFullYear();
    const month = new Date().getUTCMonth() + 1;
    const rent = 175_000;

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: `Démo ${tag}`,
          isDemo: true,
          planCode: 'TRIAL',
          trialEndsAt: (() => {
            const d = startOfTodayUtc();
            d.setUTCDate(d.getUTCDate() + 1);
            return d;
          })(),
          internalNotes: `visitor=${visitorKey.slice(0, 64)}`,
        },
      });
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: 'Visiteur démo',
          organizationId: org.id,
          role: 'USER',
          emailVerifiedAt: new Date(),
        },
      });
      const building = await tx.building.create({
        data: {
          organizationId: org.id,
          name: 'Résidence Démo Cocody',
          city: 'Abidjan',
          commune: 'Cocody',
          structureKind: BuildingStructureKind.IMMEUBLE,
          floorCount: 2,
          apartmentCount: 2,
          hasRezDeChaussee: true,
          rezApartmentCount: 0,
        },
      });
      const u1 = await tx.unit.create({
        data: {
          buildingId: building.id,
          label: 'Appartement 1-1',
          kind: UnitKind.APARTMENT,
          floor: 1,
          apartmentSlot: 1,
        },
      });
      const u2 = await tx.unit.create({
        data: {
          buildingId: building.id,
          label: 'Appartement 2-1',
          kind: UnitKind.APARTMENT,
          floor: 2,
          apartmentSlot: 1,
        },
      });
      const tenant = await tx.tenant.create({
        data: {
          organizationId: org.id,
          firstName: 'Awa',
          lastName: 'Traoré',
          phone: '+2250700000099',
          email: 'awa.demo@example.com',
        },
      });
      const lease = await tx.lease.create({
        data: {
          unitId: u1.id,
          tenantId: tenant.id,
          startDate: new Date(Date.UTC(year, 0, 1)),
          endDate: new Date(Date.UTC(year, 11, 31)),
          monthlyRent: rent,
          rentDueDay: 5,
          depositAmount: rent * 2,
          active: true,
        },
      });
      const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
      await tx.payment.create({
        data: {
          leaseId: lease.id,
          periodYear: prev.y,
          periodMonth: prev.m,
          amountDue: rent,
          dueDate: rentDueDateForBilledPeriod(prev.y, prev.m, 5),
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          amountPaid: rent,
        },
      });
      await tx.payment.create({
        data: {
          leaseId: lease.id,
          periodYear: year,
          periodMonth: month,
          amountDue: rent,
          dueDate: rentDueDateForBilledPeriod(year, month, 5),
          status: PaymentStatus.LATE,
        },
      });
      // Collecteur si table existe (raw pour éviter dépendance schema manquante en test)
      try {
        await tx.$executeRawUnsafe(
          `INSERT INTO rent_collectors (id, organization_id, name, phone, active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          randomUUID(),
          org.id,
          'Kouassi Démo',
          '+2250500000011',
        );
      } catch {
        /* table absente : ignore */
      }
      return { org, user, building, vacantUnitId: u2.id };
    });

    const accessToken = await this.jwt.signAsync(
      {
        sub: result.user.id,
        email: result.user.email,
        organizationId: result.org.id,
        isDemo: true,
      },
      { expiresIn: '24h' },
    );

    return {
      accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        organizationId: result.org.id,
        organizationName: result.org.name,
        role: 'USER' as const,
        isDemo: true,
      },
      expiresInHours: 24,
      message: 'Mode démo — les données ne sont pas conservées',
    };
  }

  /** Purge orgs démo > 24 h (idempotent). */
  async purgeExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await this.prisma.organization.findMany({
      where: { isDemo: true, createdAt: { lt: cutoff } },
      select: { id: true },
    });
    let n = 0;
    for (const o of stale) {
      try {
        await this.prisma.organization.delete({ where: { id: o.id } });
        n += 1;
      } catch (e) {
        this.logger.warn(`purge demo ${o.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    return n;
  }
}
