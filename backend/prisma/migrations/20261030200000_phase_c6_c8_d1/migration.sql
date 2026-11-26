-- C6 LeaseRentRevision + D1 plans / org billing (idempotent)

CREATE TABLE IF NOT EXISTS "lease_rent_revisions" (
  "id" TEXT NOT NULL,
  "lease_id" TEXT NOT NULL,
  "effective_from" DATE NOT NULL,
  "previous_rent" DECIMAL(12,2) NOT NULL,
  "new_rent" DECIMAL(12,2) NOT NULL,
  "percent" DECIMAL(8,4),
  "note" VARCHAR(500),
  "created_by_user_id" TEXT,
  "renewed" BOOLEAN NOT NULL DEFAULT false,
  "new_end_date" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lease_rent_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lease_rent_revisions_lease_id_idx" ON "lease_rent_revisions"("lease_id");

DO $$ BEGIN
  ALTER TABLE "lease_rent_revisions"
    ADD CONSTRAINT "lease_rent_revisions_lease_id_fkey"
    FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "plans" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit_limit" INTEGER,
  "user_limit" INTEGER,
  "features" JSONB,
  "monthly_price_fcfa" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("code")
);

INSERT INTO "plans" ("code","name","unit_limit","user_limit","features","monthly_price_fcfa","active")
VALUES
  ('FREE', 'Gratuit', 5, 1, '{"reminders":false,"collectors":false,"exports":true}'::jsonb, 0, true),
  ('TRIAL', 'Essai', 30, 3, '{"reminders":true,"collectors":true,"exports":true}'::jsonb, 0, true),
  ('PRO', 'Pro', NULL, 10, '{"reminders":true,"collectors":true,"exports":true,"closures":true}'::jsonb, 25000, true)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "plan_code" TEXT NOT NULL DEFAULT 'PRO';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "trial_ends_at" DATE;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "subscription_ends_at" DATE;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "internal_notes" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- Backfill grandfathered PRO + mirror paid-until
UPDATE "organizations"
SET "plan_code" = COALESCE(NULLIF("plan_code", ''), 'PRO'),
    "subscription_ends_at" = COALESCE("subscription_ends_at", "platform_access_paid_until")
WHERE true;

DO $$ BEGIN
  CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('WAVE', 'ORANGE', 'MTN', 'MOOV', 'CASH', 'BANK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "subscription_payments" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "amount_fcfa" INTEGER NOT NULL,
  "method" "SubscriptionPaymentMethod" NOT NULL,
  "reference" VARCHAR(120),
  "paid_at" DATE NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "recorded_by_user_id" TEXT,
  "note" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscription_payments_organization_id_idx"
  ON "subscription_payments"("organization_id");

DO $$ BEGIN
  ALTER TABLE "subscription_payments"
    ADD CONSTRAINT "subscription_payments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "plan_change_logs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "from_plan_code" TEXT,
  "to_plan_code" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "note" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plan_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "plan_change_logs_organization_id_idx"
  ON "plan_change_logs"("organization_id");

DO $$ BEGIN
  ALTER TABLE "plan_change_logs"
    ADD CONSTRAINT "plan_change_logs_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
