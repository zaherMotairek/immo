# Phase E — Go-live readiness — STOP report

**Branche :** `feat/pro-hardening`  
**Date :** 2026-10-30

## 1) Done (≤5 lignes)

- **E1** `docs/GO_LIVE.md` (staging Neon ≠ prod, env, migrate deploy, CORS/DNS) + `scripts/smoke-staging.mjs` (`/health`, `/version`, `/auth/signup-status`).
- **E2** Pages légales templates CI : CGU, confidentialité (ARTCI / loi 2013-450), cookies, support, export & suppression ; liens inscription + login.
- **E3** Checklist onboarding dashboard (bien → unité → locataire → bail → paiement) + seed opt-in ; modèle Excel vide + rapport validation erreurs/avertissements à l’import.

## 2) Files

- Docs : `docs/GO_LIVE.md`, `docs/PHASE_E_REPORT.md`
- Scripts : `scripts/smoke-staging.mjs`
- Backend : `onboarding/*`, `reports` (`buildImportTemplateExcel`, `GET import-template.xlsx`)
- Frontend : `Legal/*`, `OnboardingChecklist`, `ExportsPage` (modèle + rapport), `LoginPage` liens légaux, `InscriptionPage` CGU

## 3) Commands

```bash
# smoke local (API up)
node scripts/smoke-staging.mjs --base http://localhost:4000

cd backend
npx tsc -p tsconfig.json --noEmit

cd ../frontend
npx tsc -p tsconfig.json --noEmit
```

## 4) Screenshots

À capturer (mobile 390 + desktop) : checklist dashboard ; `/cgu` ; Exports « Modèle » + rapport validation après import test.

## 5) Migrations

Aucune migration Phase E (onboarding dismiss stocké dans `automationSettings` JSON).

## 6) Found / not fixed

- Textes légaux = **templates** — validation avocat CI avant usage commercial.
- `VITE_SUPPORT_EMAIL` à renseigner en prod (défaut `support@immopilot.ci`).
- Import template gated par feature `exports` (plans FREE sans exports → pas de modèle).

## 7) Need-from-you

- Décisions **Phase F** (F1 rôles ? F2 owners MVP ou report ?) — voir `docs/PHASE_F_ROLES_OWNERS_DESIGN.md`.
- Push / go-live staging réel ?
