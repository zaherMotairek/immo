-- Phase C1–C2 : settings automation org + file relances (idempotent)

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "automation_settings" JSONB;

DO $$ BEGIN
  CREATE TYPE "ReminderOutboxStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "reminder_outbox" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "channel" "ReminderChannel" NOT NULL,
  "rule_offset_days" INTEGER NOT NULL,
  "tone" VARCHAR(32),
  "status" "ReminderOutboxStatus" NOT NULL DEFAULT 'QUEUED',
  "body_preview" TEXT,
  "wa_me_url" VARCHAR(512),
  "error_message" VARCHAR(500),
  "scheduled_for" TIMESTAMP(3) NOT NULL,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reminder_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "reminder_outbox_payment_id_channel_rule_offset_days_key"
  ON "reminder_outbox"("payment_id", "channel", "rule_offset_days");

CREATE INDEX IF NOT EXISTS "reminder_outbox_organization_id_status_idx"
  ON "reminder_outbox"("organization_id", "status");

CREATE INDEX IF NOT EXISTS "reminder_outbox_scheduled_for_status_idx"
  ON "reminder_outbox"("scheduled_for", "status");

DO $$ BEGIN
  ALTER TABLE "reminder_outbox"
    ADD CONSTRAINT "reminder_outbox_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "reminder_outbox"
    ADD CONSTRAINT "reminder_outbox_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
