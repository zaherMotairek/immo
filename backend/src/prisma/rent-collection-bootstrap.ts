import type { PrismaClient } from '@prisma/client';

const TAG = '[rent-collection-bootstrap]';

export async function runRentCollectionBootstrap(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "rent_collectors" (
        "id" TEXT NOT NULL,
        "organization_id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "notes" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "rent_collectors_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "rent_collectors_organization_id_active_idx" ON "rent_collectors" ("organization_id", "active")`,
    );

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "payment_collection_tasks" (
        "payment_id" TEXT NOT NULL,
        "organization_id" TEXT NOT NULL,
        "collector_id" TEXT,
        "status" TEXT NOT NULL DEFAULT 'NONE',
        "assigned_at" TIMESTAMP(3),
        "collected_reported_at" TIMESTAMP(3),
        "closed_paid_at" TIMESTAMP(3),
        "last_notified_at" TIMESTAMP(3),
        "last_message" TEXT,
        "last_note" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "payment_collection_tasks_pkey" PRIMARY KEY ("payment_id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "payment_collection_tasks_organization_id_status_idx" ON "payment_collection_tasks" ("organization_id", "status")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "payment_collection_tasks_collector_id_idx" ON "payment_collection_tasks" ("collector_id")`,
    );

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "payment_collection_events" (
        "id" TEXT NOT NULL,
        "payment_id" TEXT NOT NULL,
        "organization_id" TEXT NOT NULL,
        "collector_id" TEXT,
        "event_type" TEXT NOT NULL,
        "status_after" TEXT,
        "note" TEXT,
        "message_payload" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "payment_collection_events_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "payment_collection_events_payment_id_created_at_idx" ON "payment_collection_events" ("payment_id", "created_at" DESC)`,
    );
  } catch (e) {
    console.error(TAG, 'bootstrap rent collectors / collection tasks', e);
  }
}
