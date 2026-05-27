import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type AuditActor = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

export type AuditLogInput = {
  organizationId: string;
  actor?: AuditActor | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AuditLogRow = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO "audit_logs"
      ("id","organization_id","actor_user_id","actor_email","actor_name","action","entity_type","entity_id","summary","metadata","created_at")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())
      `,
      randomUUID(),
      input.organizationId,
      input.actor?.id ?? null,
      input.actor?.email ?? null,
      input.actor?.name ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.summary ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    );
  }

  async list(
    organizationId: string,
    filters?: { action?: string; actorUserId?: string; entityType?: string; limit?: number },
  ): Promise<AuditLogRow[]> {
    const args: unknown[] = [organizationId];
    const where: string[] = [`"organization_id" = $1`];
    if (filters?.action?.trim()) {
      args.push(filters.action.trim());
      where.push(`"action" = $${args.length}`);
    }
    if (filters?.actorUserId?.trim()) {
      args.push(filters.actorUserId.trim());
      where.push(`"actor_user_id" = $${args.length}`);
    }
    if (filters?.entityType?.trim()) {
      args.push(filters.entityType.trim());
      where.push(`"entity_type" = $${args.length}`);
    }
    const safeLimit = Math.min(500, Math.max(1, filters?.limit ?? 120));
    args.push(safeLimit);
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT
        "id",
        "organization_id" AS "organizationId",
        "actor_user_id" AS "actorUserId",
        "actor_email" AS "actorEmail",
        "actor_name" AS "actorName",
        "action",
        "entity_type" AS "entityType",
        "entity_id" AS "entityId",
        "summary",
        "metadata",
        "created_at" AS "createdAt"
      FROM "audit_logs"
      WHERE ${where.join(' AND ')}
      ORDER BY "created_at" DESC
      LIMIT $${args.length}
      `,
      ...args,
    )) as AuditLogRow[];
    return rows;
  }
}
