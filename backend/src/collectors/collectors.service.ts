import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT
        c.id,
        c.name,
        c.phone,
        c.active,
        c.notes,
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        COUNT(t.payment_id)::int AS "openTasksCount"
      FROM rent_collectors c
      LEFT JOIN payment_collection_tasks t
        ON t.collector_id = c.id
       AND t.organization_id = c.organization_id
       AND t.status IN ('ASSIGNED', 'IN_PROGRESS')
      WHERE c.organization_id = $1
      GROUP BY c.id, c.name, c.phone, c.active, c.notes, c.created_at, c.updated_at
      ORDER BY c.active DESC, c.name ASC
      `,
      organizationId,
    )) as Array<Record<string, unknown>>;
    return rows;
  }

  async create(
    organizationId: string,
    dto: { name: string; phone: string; notes?: string | null },
  ) {
    const name = dto.name.trim();
    const phone = dto.phone.trim();
    if (!name) throw new BadRequestException('Nom du collecteur requis.');
    if (!phone) throw new BadRequestException('Numéro du collecteur requis.');
    const id = randomUUID();
    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO rent_collectors
        (id, organization_id, name, phone, active, notes, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, TRUE, $5, NOW(), NOW())
      `,
      id,
      organizationId,
      name,
      phone,
      dto.notes?.trim() || null,
    );
    return this.getOne(id, organizationId);
  }

  async update(
    id: string,
    organizationId: string,
    dto: { name?: string; phone?: string; active?: boolean; notes?: string | null },
  ) {
    const existing = await this.getOne(id, organizationId);
    if (!existing) throw new NotFoundException('Collecteur introuvable.');
    const next = {
      name: dto.name !== undefined ? dto.name.trim() : String(existing.name ?? ''),
      phone: dto.phone !== undefined ? dto.phone.trim() : String(existing.phone ?? ''),
      active: dto.active ?? Boolean(existing.active),
      notes: dto.notes !== undefined ? dto.notes?.trim() || null : (existing.notes as string | null),
    };
    if (!next.name) throw new BadRequestException('Nom du collecteur requis.');
    if (!next.phone) throw new BadRequestException('Numéro du collecteur requis.');
    await this.prisma.$executeRawUnsafe(
      `
      UPDATE rent_collectors
         SET name = $1,
             phone = $2,
             active = $3,
             notes = $4,
             updated_at = NOW()
       WHERE id = $5
         AND organization_id = $6
      `,
      next.name,
      next.phone,
      next.active,
      next.notes,
      id,
      organizationId,
    );
    return this.getOne(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE rent_collectors SET active = FALSE, updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
      id,
      organizationId,
    );
    return { ok: true };
  }

  async getOne(id: string, organizationId: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT id, name, phone, active, notes, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM rent_collectors
        WHERE id = $1
          AND organization_id = $2
        LIMIT 1`,
      id,
      organizationId,
    )) as Array<Record<string, unknown>>;
    if (!rows.length) throw new NotFoundException('Collecteur introuvable.');
    return rows[0]!;
  }
}
