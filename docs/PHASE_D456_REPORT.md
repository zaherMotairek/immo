# Phase D4–D6 — STOP report

**Branche :** `feat/pro-hardening`  
**Date :** 2026-10-30

## 1) Done (≤5 lignes)

- **D4** `/demo` → sandbox `isDemo`, seed, JWT 24 h, bannière + CTA inscription ; purge job ; pas d’e-mail/WA réels ; hors liste admin / CA.
- **D5** `/inscription` (flag `SELF_SIGNUP_ENABLED`, défaut on) + vérif e-mail + MDP fort + case CGU ; `/verifier-email`.
- **D6** paiements abo `prepaidMonths` 1/3/12 (12→+1 mois offert), champs `provider`/`providerRef`, grâce 3 j (`BILLING_GRACE_DAYS`).

## 2) Files

- Backend : `demo/*`, `auth/register|verify`, `billing/billing.config.ts`, migration `20261030220000_phase_d4_d6`, jobs demo-purge
- Frontend : `DemoPage`, `InscriptionPage`, `VerifyEmailPage`, bannières Layout, forfait admin

## 3) Commands

```bash
cd backend
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261030220000_phase_d4_d6/migration.sql
npx prisma generate   # stopper API si EPERM
npm test -- --testPathPattern="billing.config"
npx tsc -p tsconfig.json --noEmit
```

Env utiles : `SELF_SIGNUP_ENABLED=true|false`, `BILLING_GRACE_DAYS=3`, `BILLING_ANNUAL_BONUS_MONTHS=1`.

## 4) Screenshots

`/demo`, `/inscription`, bannière démo dashboard (390 + desktop).

## 5) Migrations

- `User.email_verified_at` (+ backfill)
- `email_verification_tokens`
- `subscription_payments.prepaid_months|provider|provider_ref`

## 6) Found / not fixed

- Collecteur démo via SQL raw (si table absente → ignore).
- CGU Phase E = case obligatoire sans pages légales encore.

## 7) Need-from-you

- GO Phase E / F ? Push ?
