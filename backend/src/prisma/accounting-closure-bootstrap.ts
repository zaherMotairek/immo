import type { PrismaClient } from '@prisma/client';

const TAG = '[accounting-closure-bootstrap]';

export async function runAccountingClosureBootstrap(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "accounting_period_closures" (
        "id" TEXT NOT NULL,
        "organization_id" TEXT NOT NULL,
        "period_year" INTEGER NOT NULL,
        "period_month" INTEGER NOT NULL,
        "closed_by_user_id" TEXT,
        "closed_by_email" TEXT,
        "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "accounting_period_closures_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "accounting_period_closures_org_year_month_key" ON "accounting_period_closures" ("organization_id","period_year","period_month")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "accounting_period_closures_org_year_idx" ON "accounting_period_closures" ("organization_id","period_year")`,
    );
  } catch (e) {
    console.error(TAG, 'bootstrap accounting_period_closures', e);
  }
}
