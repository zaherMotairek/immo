# E2E ImmoPilot (Playwright) — Phase 0

Suite **smoke + captures d’écran de référence** pour le refactor design system.

## Prérequis

1. **PostgreSQL** local avec base `immopilot` (ou autre, via `DATABASE_URL`).
2. Backend configuré (`backend/.env` depuis `.env.example`).
3. Seed admin + démo :

```bash
cd backend
npm install
npx prisma migrate deploy
npm run seed
npm run start:dev
```

Compte seed : utiliser les identifiants du seed backend (variables `SEED_ADMIN_*` / `E2E_ADMIN_*` — **à changer hors dev**). Ne pas documenter de mot de passe en clair ici.

4. Front : dépendances + navigateurs Playwright :

```bash
cd frontend
npm install
npx playwright install chromium
```

L’API doit tourner sur **http://localhost:4000** (le `preview` Vite proxye les chemins API comme en dev).

> Si `preview` ne proxy pas l’API, lancez aussi `npm run dev` et pointez  
> `E2E_BASE_URL=http://127.0.0.1:5173 E2E_SKIP_WEBSERVER=1`.

## Lancer les checks visuels (Phase 6)

Depuis `frontend/` ou la racine :

```bash
npm run check:visual              # smoke : pages chargent + captures (défaut CI-friendly)
npm run check:visual:compare      # diff pixel vs baselines (E2E_VISUAL_COMPARE=1)
npm run e2e:visual:update         # depuis frontend/ : met à jour les snapshots compare
npm run e2e:screenshots           # régénère toutes les baselines Phase 0 (écriture disque)
```

Captures de référence :

```
frontend/e2e/baselines/{mobile|desktop}/{light|dark}/*.png
```

Rapport HTML Playwright : `frontend/e2e/playwright-report/`.

> Après une grosse migration UI, les baselines peuvent diverger : préférer le **smoke** au quotidien, puis `e2e:visual:update` quand on fige une nouvelle référence.

## Ce qui est capturé

- Viewports **390×844** (mobile) et **1440×900** (desktop)
- Thèmes **clair** et **sombre** (`localStorage` `immopilot-theme`)
- Routes de `App.tsx` : login, forgot/reset, dashboard, locations, biens (+ détail si seed), locataires, baux, paiements, activité loyers, cautions, exports, comptabilité, journal, collecteurs, profil, admin
- Redirects `/immeubles` non capturés (équivalent `/biens`)

## Phase 2 — options design (A/B)

La page `/design` n’existe qu’en **DEV** (`import.meta.env.DEV`). Captures :

```bash
# Terminal 1 — API + seed déjà OK
cd frontend && npm run dev

# Terminal 2
cd frontend
set E2E_BASE_URL=http://127.0.0.1:5173
set E2E_SKIP_WEBSERVER=1
npm run e2e:design-options
```

Sortie : `frontend/e2e/phase2-options/*.png` (design + dashboard, options A/B).

## Notes

- Justification dépendance : demandée explicitement en Phase 0 (filet visuel avant refactor UI).
- Les PNG de `e2e/baselines/` sont versionnés ; la comparaison pixel est opt-in (`check:visual:compare`).
- Ne pas committer `e2e/test-results/` ni `e2e/playwright-report/`.
- `phase2-options/` : captures de choix produit Phase 2 (peuvent être versionnées).
- `phase4h/` + `phase4h-locations.spec.ts` : captures avant/après migration Locations.
