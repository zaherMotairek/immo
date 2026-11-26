# Phase C5–C8 — STOP report

Branche : `feat/pro-hardening`  
Date : 2026-10-30

## 1. What I did

- **C7** `FinanceSummaryService` + `GET /finance/summary` + hook `useFinanceSummary` ; dashboard KPIs dérivés du snapshot ; test alignement overview ↔ summary.
- **C5** `GET /finance/today` + section **Aujourd’hui** sur Accueil (relances, retards >7j, fins de bail 60j, collectes à valider, cautions).
- **C6** Design only : `docs/PHASE_C6_LEASE_REVISION_DESIGN.md` (options A amendement / B nouveau bail).
- **C8** Proposition ci-dessous (pas d’implémentation).

## 2. Files

- `backend/src/finance/*`, `dashboard.service.ts`, tests `finance-summary.spec.ts`
- `frontend/src/hooks/useFinanceSummary.ts`, `TodaySection.tsx`, `DashboardPage`, `PaymentsSummary`, proxy `/finance`
- `docs/PHASE_C6_LEASE_REVISION_DESIGN.md`

## 3. Commands

```
cd backend && npm test -- --testPathPattern="finance-summary|dashboard-totals" && npx tsc -p tsconfig.json --noEmit
cd frontend && npx tsc -b
```

## 4. Screenshots

`frontend/e2e/phase-c58/` (Accueil Aujourd’hui + Paiements réf. mois).

## 5. Migrations

Aucune.

## 6. C8 — Double saisie biens (proposition, attendre choix)

| Option | Idée | Migration | Risque |
|--------|------|-----------|--------|
| **C8-A** | « Total déclaré » = `count(Unit)` (lecture seule) ; champs déclaratifs deviennent **indicatif / optionnel** | Soft : UI + API dérivent du count ; colonnes gardées | Moins de saisie ; perd la grille « prévue » avant création des lots |
| **C8-B** | Auto-créer les `Unit` depuis `floorCount × apartmentsPerFloor + rez…` à la création / sync | Script idempotent + UI « Générer les lots manquants » | Lots fantômes si structure mal saisie ; labels à générer |

**Recommandation :** C8-A en v1 (dériver l’affichage), C8-B en action explicite « Générer » sans overwrite.

## 7. Found, not fixed

- Synthèse Paiements **filtre actif** reste distincte du mois civil (volontaire) ; bandeau « Réf. mois » ajoute la source unique.
- Comptabilité annuelle / charges pas encore branchées sur `FinanceSummaryService`.
- C6 / C8 non implémentés (attente GO).

## 8. Need from you

- GO modèle **C6** (A ou B) ?
- GO **C8-A**, **C8-B**, ou les deux (A + generate) ?
- Phase D ? Push ?
