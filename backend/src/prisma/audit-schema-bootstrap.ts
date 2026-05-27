import type { PrismaClient } from '@prisma/client';

const TAG = '[audit-schema-bootstrap]';

export async function runAuditSchemaBootstrap(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" TEXT NOT NULL,
        "organization_id" TEXT NOT NULL,
        "actor_user_id" TEXT,
        "actor_email" TEXT,
        "actor_name" TEXT,
        "action" TEXT NOT NULL,
        "entity_type" TEXT NOT NULL,
        "entity_id" TEXT,
        "summary" TEXT,
        "metadata" JSONB,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "audit_logs_organization_id_created_at_idx" ON "audit_logs" ("organization_id", "created_at" DESC)`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_created_at_idx" ON "audit_logs" ("actor_user_id", "created_at" DESC)`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs" ("action", "created_at" DESC)`,
    );
  } catch (e) {
    console.error(TAG, 'bootstrap audit_logs', e);
  }
}
