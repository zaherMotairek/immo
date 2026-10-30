-- Phase B5 : tables / colonnes historiquement créées par les bootstraps SQL (idempotent).
-- Rollback : ne pas DROP en prod (données) — documenter seulement la désactivation ENABLE_SCHEMA_BOOTSTRAP.

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "receipt_signature_file_key" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "receipt_signature_mime" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "receipt_signature_uploaded_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "receipt_share_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "receipt_share_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "receipt_share_tokens_token_key" ON "receipt_share_tokens" ("token");
CREATE INDEX IF NOT EXISTS "receipt_share_tokens_expires_at_idx" ON "receipt_share_tokens" ("expires_at");
ALTER TABLE "receipt_share_tokens" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);
ALTER TABLE "receipt_share_tokens" ADD COLUMN IF NOT EXISTS "access_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "summary" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "audit_logs_org_created_idx" ON "audit_logs" ("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_created_idx" ON "audit_logs" ("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_idx" ON "audit_logs" ("action", "created_at");

CREATE TABLE IF NOT EXISTS "accounting_period_closures" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "closed_by_user_id" TEXT,
    "closed_by_email" TEXT,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounting_period_closures_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "accounting_period_closures_org_year_month_key"
  ON "accounting_period_closures" ("organization_id","period_year","period_month");
CREATE INDEX IF NOT EXISTS "accounting_period_closures_org_year_idx"
  ON "accounting_period_closures" ("organization_id","period_year");

CREATE TABLE IF NOT EXISTS "rent_collectors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rent_collectors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "rent_collectors_org_idx" ON "rent_collectors" ("organization_id");

CREATE TABLE IF NOT EXISTS "payment_collection_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "collector_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_collection_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payment_collection_tasks_org_idx" ON "payment_collection_tasks" ("organization_id");
CREATE INDEX IF NOT EXISTS "payment_collection_tasks_payment_idx" ON "payment_collection_tasks" ("payment_id");

CREATE TABLE IF NOT EXISTS "payment_collection_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_collection_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payment_collection_events_task_idx" ON "payment_collection_events" ("task_id");

CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "device_type" TEXT,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT,
    "friendly_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "webauthn_credentials_credential_id_key" ON "webauthn_credentials"("credential_id");
CREATE INDEX IF NOT EXISTS "webauthn_credentials_user_id_idx" ON "webauthn_credentials"("user_id");

CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT,
    "challenge" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "webauthn_challenges_user_id_idx" ON "webauthn_challenges"("user_id");
CREATE INDEX IF NOT EXISTS "webauthn_challenges_email_idx" ON "webauthn_challenges"("email");
CREATE INDEX IF NOT EXISTS "webauthn_challenges_expires_at_idx" ON "webauthn_challenges"("expires_at");
