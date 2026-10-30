# Phase F1 — Rôles org — STOP report

**Branche :** `feat/pro-hardening`  
**Date :** 2026-10-30

## Décisions produit

| Choix | Décision |
|-------|----------|
| F1 vs F2 | **F1 maintenant** (cible = propriétaire autogéré multi-comptes) |
| F2 owners/agences | **Reporté** (priorité basse) |
| Push | **Non** (sauf demande explicite) |

## 1) Done (≤5 lignes)

- Enum `OrgMemberRole` + `User.orgRole` (default / grandfather `OWNER`).
- Matrice perms + `OrgPermGuard` / `@RequireOrgPerm` sur mutations métier (biens, locataires, baux, paiements, charges, collecteurs, relances, automation, exports/clôtures).
- `GET /me/entitlements` → `orgRole` + `permissions` ; `GET/PATCH /me/members` (OWNER) ; UI nav filtrée + onglet Profil « Équipe ».

## 2) Files

- Prisma : `schema.prisma`, migration `20261030230000_phase_f1_org_role`
- Auth : `org-permissions.ts`, `org-perm.guard.ts`, `org-members.controller.ts`, JWT/`profile` `orgRole`
- Controllers métier + entitlements
- FE : `useOrgEntitlements`, `Layout`, `ProfileMembersTab`, `ProfilePage`

## 3) Commands

```bash
cd backend
node ../scripts/assert-local-db.mjs
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261030230000_phase_f1_org_role/migration.sql
npx prisma generate
npm test -- --testPathPattern="org-permissions|entitlements"
npx tsc -p tsconfig.json --noEmit
cd ../frontend && npx tsc -p tsconfig.json --noEmit
```

## 4) Screenshots

Mon compte → Équipe (changer un rôle) ; nav Collecteur (sans Excel / collecteurs entité) — mobile 390 + desktop.

## 5) Migrations

- Additive : `OrgMemberRole` + `User.org_role` DEFAULT `OWNER`
- Rollback : `ALTER TABLE "User" DROP COLUMN "org_role"; DROP TYPE "OrgMemberRole";`

## 6) Found / not fixed

- Pas de lien compte Collecteur ↔ entité `rent_collectors` (v1 = droits org-wide).
- Invitation e-mail multi-users org hors admin plateforme : pas ajoutée (changement de rôle sur users existants seulement).
- Boutons CRUD individuels non tous masqués (nav + API 403 ; UX progressive).

## 7) Need-from-you

- Screenshots OK ? Push ? Relancer F2 plus tard ?
