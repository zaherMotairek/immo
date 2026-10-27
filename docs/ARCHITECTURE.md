# ImmoPilot — Architecture (aperçu)

Monorepo **gestion locative** : frontend React + backend NestJS + PostgreSQL (Prisma).

## Frontend (`frontend/`)

| Couche | Rôle |
|--------|------|
| `src/pages/` | Écrans (orchestration routes) — migrés kit Calm ledger (Phase 4) |
| `src/components/ui/` | **Kit UI unique** (Button, Field, Modal, toast, confirmDialog…) |
| `src/components/ui.tsx` | Pont legacy ré-exports |
| `src/theme/` | Tokens CSS (`tokens.css`), preview options A/B |
| `src/features/` | Domaines UI (ex. buildings) sans logique API métier nouvelle |
| `src/auth/`, `src/lib/` | Session, helpers navigation / format |

- Build : Vite + React 19 + Tailwind 4.  
- Design system : [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).  
- Qualité UI : `npm run check:ui` (guardrails) ; `npm run check:visual` (Playwright smoke / compare).  
- Routes hors login : **lazy** (`App.tsx`).

## Backend (`backend/`)

| Couche | Rôle |
|--------|------|
| NestJS modules | Auth JWT, organisations, biens, baux, paiements, compta, exports… |
| Prisma | Schéma PostgreSQL + migrations |
| `scripts/` | Seed, création org/utilisateur |

- API locale typique : `http://localhost:4000`.  
- **Risques connus (inventaire lecture seule Phase 7)** : [`docs/BACKEND_RISKS.md`](./BACKEND_RISKS.md) — bootstraps SQL, JWT/CORS, uploads, rate-limit, isolation multi-org, etc. Aucune correction automatique dans ce doc.

## Contrats partagés

`shared/contracts/` — types / contrats optionnels entre front et back.

## Vérifications monorepo

```bash
npm run check              # front (lint + guardrails UI + build) + back (typecheck + build)
npm run check:visual       # Playwright smoke captures (API seed requise)
npm run check:visual:compare  # diff pixel vs e2e/baselines (opt-in)
```
