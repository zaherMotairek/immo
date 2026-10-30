# Phase D3 — STOP report (Admin redesign)

**Branche :** `feat/pro-hardening`  
**Date :** 2026-10-30

## 1) Done (≤5 lignes)

- Dashboard admin : CA abo du mois, expirations 7 j, essais 3 j, inactifs 14 j, signups.
- Liste clients : recherche + filtres statut/plan, badges FR, unités used/limit ; modal nouveau client (lien MDP, pas de MDP choisi).
- Fiche `/admin/clients/:id` : Abonnement (plan, prolonger, suspendre, paiement Wave/…), Utilisateurs (invite lien, reset lien, désactiver), Activité, Notes.
- Impersonation lecture seule 30 min + bannière + audit ; job rappels échéance J-7/J-1/J0.

## 2) Files

- Backend : `admin.service.ts`, `admin.controller.ts`, `admin.module.ts`, DTOs, `read-only.interceptor.ts`, `subscription-expiry-notice.job.ts`, migration `deactivated_at`
- Frontend : `AdminClientsPage.tsx`, `AdminClientDetailPage.tsx`, routes App, banner Layout, AuthUser readOnly

## 3) Commands

```bash
cd backend
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261030210000_phase_d3_user_deactivated/migration.sql
# stopper API si EPERM puis :
npx prisma generate
npm test -- --testPathPattern="admin.service"
npx tsc -p tsconfig.json --noEmit
```

## 4) Screenshots

À capturer : `/admin` (desktop + 390) ; fiche client onglets.

## 5) Migrations

- `20261030210000_phase_d3_user_deactivated` (`users.deactivated_at`)

## 6) Found / not fixed

- Comparaison DATE exacte pour notices d’expiry peut manquer selon timezone stockée.
- WhatsApp expiry notices non branchés (e-mail seulement via MailService).

## 7) Need-from-you

- GO **D4–D6** (demo / inscription / billing prepaid) ? Push ?
