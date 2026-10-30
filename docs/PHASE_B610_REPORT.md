# Phase B6–B10 — STOP report

Branche : `feat/pro-hardening`  
Date : 2026-10-30

## 1. What I did

- **B6** `syncLateStatuses(organizationId?)` : chemins HTTP passent l’org ; sans org = job global uniquement. Test caractérisation isole 2 orgs.
- **B7** `@nestjs/schedule` : cron `0 6 * * *` `Africa/Abidjan` + `pg_try_advisory_lock` / unlock.
- **B8** `x-request-id`, Sentry optionnel (`SENTRY_DSN` / `VITE_SENTRY_DSN`), `GET /health` (DB), `GET /version`.
- **B9** `docs/OPERATIONS.md` (Neon PITR, secrets, rollback Render, checklist).
- **B10** `.github/workflows/ci.yml` (backend Postgres service + tests, front lint/build, e2e smoke login).

## 2. Files (principaux)

- `payments.service.ts`, call sites dashboard/leases/reports/excel-import, `payments-money.spec.ts`
- `jobs/*`, `health/*`, `common/request-id.middleware.ts`, `common/sentry.ts`
- `frontend/src/lib/sentry.ts`, `e2e/ci-smoke.spec.ts`
- `docs/OPERATIONS.md`, `.github/workflows/ci.yml`

## 3. Commands

```
node scripts/assert-local-db.mjs
cd backend && npm test && npx tsc -p tsconfig.json --noEmit
cd frontend && npm run lint && npm run build
```

## 4. Screenshots

N/A

## 5. Migrations + rollback

Aucune migration Prisma nouvelle (B6–B10). Rollback code = revert commits ; job/Sentry/CI sans impact schéma.

## 6. Found, not fixed

- Fallback on-read `syncLateStatuses(org)` encore appelé sur listes/overview (comportement inchangé, scopé).
- Sentry packages à installer si DSN défini (`@sentry/node`, `@sentry/react`).
- E2E CI = smoke login seulement (pas Phase 4 complète).
- Throttler / lockout toujours en mémoire process.

## 7. Need from you

- **GO** Phase C ?
- Push branche ?
- Définir `SENTRY_DSN` / `VITE_SENTRY_DSN` en prod si souhaité.
