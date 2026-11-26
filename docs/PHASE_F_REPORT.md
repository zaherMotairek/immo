# Phase F — Rôles & propriétaires — STOP report (design only)

**Branche :** `feat/pro-hardening`  
**Date :** 2026-10-30

## 1) Done (≤5 lignes)

- **F1** Rapport design : constat `USER` / `PLATFORM_ADMIN` ; matrice capacités + écrans + groupes d’endpoints pour Owner / Comptable / Collecteur (compte) / Lecture ; impact Nest + FE ; risques entité vs compte collecteur.
- **F2** Rapport design module propriétaires / agences (Owner, mandate, fee%, payout, statement) ; réutilisation `shared/contracts/owners.ts` ; priorité basse.
- **Aucune implémentation code** (brief : design first, tu choisis).

## 2) Files

- `docs/PHASE_F_ROLES_OWNERS_DESIGN.md` (détail)
- `docs/PHASE_F_REPORT.md` (ce STOP)

## 3) Commands

N/A (docs only).

## 4) Screenshots

N/A.

## 5) Migrations

Aucune.

## 6) Found / not fixed

- Contrats `owners.ts` vocabulaire anglo à aligner CI si F2 lancé.

## 7) Décisions (agent, 2026-10-30)

1. **F1 implémenté** — voir `docs/PHASE_F1_REPORT.md`.
2. **F2 reporté** (agences / propriétaires tiers).
3. **Pas de push** tant que non demandé.
