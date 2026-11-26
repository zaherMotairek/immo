# Phase G1–G2 — États des lieux & réparations

**Branche :** `feat/pro-hardening`  
**Date :** 2026-11-26

## 1. Ce qui a été fait

- Fusion de `main` (polish UI + marketing) dans `feat/pro-hardening` avec résolution des conflits (`Layout`, `ExportsPage`, `assert-local-db`).
- **G1** : module API `inspections` (checklist entrée/sortie, photos via `StorageService`, signature locataire, PDF, comparaison entrée/sortie, décision caution sur sortie, modèles de checklist par organisation).
- **G2** : module API `repairs` (demandes, statuts, urgence, photos, coûts, charge `MAINTENANCE`, repère « en retard »).
- Front : pages `/etats-des-lieux` et `/reparations`, entrées menu « Plus », upload photo mobile (`capture="environment"`).

## 2. Fichiers principaux

| Zone | Fichiers |
|------|----------|
| Schéma / migration | `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261126180000_phase_g_inspections_repairs/` |
| Backend | `backend/src/inspections/*`, `backend/src/repairs/*`, `backend/src/storage/storage.types.ts`, `backend/src/app.module.ts` |
| Front | `frontend/src/pages/InspectionsPage.tsx`, `RepairsPage.tsx`, `frontend/src/lib/api.ts`, `Layout.tsx`, `App.tsx` |

## 3. Commandes & résultats

```text
npm run assert-local-db          → OK (localhost)
backend npm run typecheck        → OK
frontend eslint (npm run check)  → échec préexistant (warning AdminClientDetailPage, hors G)
prisma generate / build          → EPERM Windows sur query-engine (verrou fichier — relancer hors IDE / arrêter l’API)
```

**Migration locale :** `20261126180000_phase_g_inspections_repairs` marquée appliquée ; si les tables manquent, exécuter le SQL du dossier migration sur la base locale.

**Rollback :** `DROP TABLE` dans l’ordre inverse des FK (`repair_photos`, `repair_requests`, `lease_inspection_photos`, `lease_inspection_items`, `lease_inspections`, `inspection_checklist_template_items`, `inspection_checklist_templates`) puis `DROP TYPE` des enums G.

## 4. Captures

Non prises dans cette session (API + front à démarrer en local). À faire : mobile 390 px + desktop sur `/etats-des-lieux` et `/reparations`.

## 5. Trouvé, non corrigé

- P3009 historique sur `20260423143000_organization_platform_access` (DB locale).
- Compression image serveur : pas de `sharp` — limite Multer 8 Mo (compression côté client possible plus tard).
- G3 (onboarding / import) et G4 (design révision loyer) déjà partiellement couverts ailleurs — prochain STOP dédié si vous le souhaitez.
- **F2** propriétaires agences : toujours reporté.

## 6. Besoin de vous

- Valider G1–G2 en local (créer EDL entrée/sortie, PDF, réparation + charge).
- **GO** pour commit/push sur `feat/pro-hardening` et pour enchaîner **G3–G4** ou **Phase E (go-live)**.
- Avant merge vers `main` / Render : snapshot Neon manuel.