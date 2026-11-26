# Phase C6+C8 + D1–D2 — STOP report

**Branche :** `feat/pro-hardening`  
**Date :** 2026-10-30

## 1) Done (≤5 lignes)

- **C6-A** : `LeaseRentRevision` + `POST /leases/:id/revise` (loyer %/montant, effectiveFrom, renew) ; UI fiche location « Réviser / renouveler ».
- **C8-A** : `unitsCount` = source de vérité ; structure déclarée = indicative (labels UI + API).
- **C8-B** : `POST /buildings/:id/generate-units` (idempotent) ; FE appelle l’API.
- **D1** : tables `plans`, `subscription_payments`, `plan_change_logs` + colonnes org (`plan_code` PRO grandfathered).
- **D2** : `EntitlementsService` + `GET /me/entitlements` ; limites unités/users + features ; job `TrialExpiryJob` TRIAL→FREE.

## 2) Files

- `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261030200000_phase_c6_c8_d1/`
- `backend/src/leases/*` (revise), `backend/src/buildings/*` (generate-units, unitsCount)
- `backend/src/entitlements/*`, `backend/src/jobs/trial-expiry.job.ts`
- FE : `LocationReviseSection.tsx`, `useLocationFiche.ts`, `useUnitActions.ts`, `buildingStats*.tsx`, `OrganisationTab.tsx`

## 3) Commands

```bash
cd backend
node ../scripts/assert-local-db.mjs
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261030200000_phase_c6_c8_d1/migration.sql
npx prisma generate
npm test -- --testPathPattern="entitlements|revise-lease"
npx tsc -p tsconfig.json --noEmit
```

## 4) Screenshots

À capturer après redémarrage API (mobile 390 + desktop) : fiche location révision ; fiche bien « Unités (réel) » + Générer.

## 5) Migrations

- Additive only : `20261030200000_phase_c6_c8_d1`
- Backfill : orgs existantes → `plan_code=PRO`, `subscription_ends_at` ← `platform_access_paid_until`

## 6) Found / not fixed

- `prisma generate` peut échouer EPERM sous Windows si `start:dev` tient `query-engine-windows.exe` — stopper l’API avant generate.
- Exports table PDF hors summary.* non tous gated (summary pdf/xlsx + closures oui).

## 7) Need-from-you

- GO **D3** (admin redesign) ? Screenshots OK ? Push ?
