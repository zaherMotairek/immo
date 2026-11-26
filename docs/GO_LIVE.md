# ImmoPilot — Go-live (staging → prod)

**Phase E1.** Ne jamais partager la base de production avec le staging.

## 1. Environnements

| | Staging | Production |
|--|---------|------------|
| API | Render service `immopilot-api-staging` | `immopilot-api` |
| Front | Render Static / Vercel preview | domaine final HTTPS |
| DB | **Branche Neon dédiée** `staging` | branche Neon `main` / prod |
| Secrets | env staging séparés | env prod |

Créer la branche Neon depuis un snapshot **anonymisé** ou vide + `prisma migrate deploy` — **jamais** le même `DATABASE_URL` que la prod.

## 2. Variables d’environnement (API)

| Variable | Staging | Prod | Notes |
|----------|---------|------|-------|
| `NODE_ENV` | `production` | `production` | |
| `DATABASE_URL` | Neon **staging** | Neon **prod** | SSL Neon ; pooler pour l’app |
| `DATABASE_URL_DIRECT` | optionnel | **recommandé Render** | Même base, hôte **sans** `-pooler` (migrations Prisma) |
| `JWT_SECRET` | secret staging | secret **différent** | ≥32 car. |
| `FRONTEND_ORIGIN` | URL front staging | URL front prod | CORS, CSV multi-origines OK |
| `PUBLIC_APP_URL` | idem front | idem | liens reset / vérif e-mail |
| `SELF_SIGNUP_ENABLED` | `true` si test | `true`/`false` | admin peut couper |
| `BILLING_GRACE_DAYS` | `3` | `3` | |
| `BILLING_ANNUAL_BONUS_MONTHS` | `1` | `1` | |
| `STORAGE_DRIVER` | `local` ou `s3` | `s3` recommandé | |
| `SENTRY_DSN` | optionnel | recommandé | |
| SMTP / WhatsApp | sandbox | réel | démo n’envoie pas |

Front : `VITE_API_URL`, `VITE_SENTRY_DSN`.

## 3. Migrations

**Avant** chaque démarrage / release API :

```bash
npx prisma migrate deploy
```

Rollback : pas de `migrate down` automatique. Options :

1. PITR Neon vers une branche de secours (voir `docs/OPERATIONS.md`).
2. Migration corrective additive (recommandé).
3. Rollback code **uniquement** si le schéma reste compatible.

## 4. Cookies / CORS / DNS

- HTTPS obligatoire en prod (Render / CDN).
- CORS : uniquement `FRONTEND_ORIGIN` (pas `*` en prod).
- Cookies app : JWT en `Authorization: Bearer` (pas cookie session) — pas de `SameSite` session côté API.
- DNS : `app.` → front ; `api.` → Render ; certificats Let’s Encrypt / Render.

## 5. Smoke test staging

```bash
# depuis la racine, API staging joignable
node scripts/smoke-staging.mjs --base https://api-staging.example.com
```

Vérifie : `/health`, `/version`, `/auth/signup-status`.

Manuel ensuite : login admin, `/admin`, créer un client test, `/demo`, inscription + lien vérif (SMTP log).

## 6. Checklist go-live

1. Branche Neon staging ≠ prod ; migrate deploy OK.
2. Secrets distincts ; `FRONTEND_ORIGIN` / `PUBLIC_APP_URL` corrects.
3. Smoke + parcours onboarding (bien → unité → locataire → bail → paiement).
4. Pages légales publiées (`/cgu`, `/confidentialite`, `/cookies`, `/support`, `/mes-donnees`) ; `VITE_SUPPORT_EMAIL` renseigné.
5. Sentry / uptime sur `/health`.
6. Coupure `ENABLE_SCHEMA_BOOTSTRAP` si encore actif (voir OPERATIONS).
