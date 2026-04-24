-- Accès plateforme : paiement mensuel (date limite inclusive) et suspension manuelle.
ALTER TABLE "organizations" ADD COLUMN "platform_access_paid_until" DATE;
ALTER TABLE "organizations" ADD COLUMN "platform_access_suspended" BOOLEAN NOT NULL DEFAULT false;
