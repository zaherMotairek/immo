# Phase B1–B5 — STOP report

Branche : `feat/pro-hardening`  
Date : 2026-10-30

## 1. What I did

- **B1** StorageService (local + S3/R2), contrats & pièces d’identité branchés ; magic bytes ; script `migrate-uploads-to-s3.mjs` (dry-run).
- **B2** Validation env prod (`JWT_SECRET` ≥32, `DATABASE_URL`, `FRONTEND_ORIGIN`, `PUBLIC_APP_URL`) ; plus de fallback JWT en prod.
- **B3** helmet, body 1 Mo, CORS strict en prod, throttler global + durci sur auth/quittance publique, lockout login, validation MIME réelle.
- **B4** Liens quittance : TTL configurable (défaut 30 j), `revoked_at` / `access_count`, endpoint revoke.
- **B5** Migration Prisma idempotente des tables bootstrap + `ENABLE_SCHEMA_BOOTSTRAP` (défaut true en transition).

## 2. Files (principaux)

- `backend/src/storage/*`, `common/file-magic.ts`, `config/validate-env.ts`
- `leases.service.ts`, `tenants.service.ts`, `main.ts`, `app.module.ts`, `auth/*`
- `payments.service.ts` / controller / public
- `prisma/migrations/20261030170000_phase_b_bootstraps_and_receipt_revoke/`
- `scripts/migrate-uploads-to-s3.mjs`

## 3. Commands

À rejouer localement après install deps :

```
node scripts/assert-local-db.mjs
cd backend && npm test && npx tsc -p tsconfig.json --noEmit
```

## 4. Screenshots

N/A

## 5. Migrations + rollback

- Ajout : `20261030170000_phase_b_bootstraps_and_receipt_revoke` (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).
- Rollback : **ne pas DROP** les tables en prod ; laisser les colonnes ; remettre `ENABLE_SCHEMA_BOOTSTRAP=true` si besoin. Pas de perte de données métier prévue.

## 6. Found, not fixed

- B6–B10 non faits (syncLate scoped, scheduler, Sentry, CI, OPERATIONS.md).
- Indexes JSON contrats/ID encore via Storage (OK) mais anciennes copies disque non migrées tant que le script n’est pas lancé avec `--apply`.
- Throttler / lockout = mémoire process (multi-instance Render = compteurs séparés).
- `prisma migrate diff` old vs new non exécuté ici (à faire sur copie locale dédiée).

## 7. Need from you

- **GO** pour B6–B10 ?
- Sur Render : définir `FRONTEND_ORIGIN`, `PUBLIC_APP_URL`, `JWT_SECRET` fort ; pour fichiers soit S3 soit `STORAGE_ALLOW_LOCAL=true` + disque persistant.
- Push branche ? (pas fait — attendre ton OK)
