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

Compte seed (à changer en prod) :

| Champ | Valeur |
|-------|--------|
| E-mail | `admin@immopilot.local` |
| Mot de passe | `AdminImmo2026!` |

Variables optionnelles : `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`.

4. Front : dépendances + navigateurs Playwright :

```bash
cd frontend
npm install
npx playwright install chromium
```

L’API doit tourner sur **http://localhost:4000** (le `preview` Vite proxye les chemins API comme en dev).

> Si `preview` ne proxy pas l’API, lancez aussi `npm run dev` et pointez  
> `E2E_BASE_URL=http://127.0.0.1:5173 E2E_SKIP_WEBSERVER=1`.

## Lancer les baselines

Depuis `frontend/` :

```bash
npm run e2e:screenshots
```

Ou depuis la racine du monorepo :

```bash
npm run check:visual
```

Captures écrites dans :

```
frontend/e2e/baselines/{mobile|desktop}/{light|dark}/*.png
```

Rapport HTML Playwright : `frontend/e2e/playwright-report/`.

## Ce qui est capturé

- Viewports **390×844** (mobile) et **1440×900** (desktop)
- Thèmes **clair** et **sombre** (`localStorage` `immopilot-theme`)
- Routes de `App.tsx` : login, forgot/reset, dashboard, locations, biens (+ détail si seed), locataires, baux, paiements, activité loyers, cautions, exports, comptabilité, journal, collecteurs, profil, admin
- Redirects `/immeubles` non capturés (équivalent `/biens`)

## Notes

- Justification dépendance : demandée explicitement en Phase 0 (filet visuel avant refactor UI).
- Les PNG de `e2e/baselines/` sont destinés au versionnement pour comparaison ultérieure (Phase 6).
- Ne pas committer `e2e/test-results/` ni `e2e/playwright-report/`.
