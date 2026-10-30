# ImmoPilot — Opérations (prod)

Branche de référence : `feat/pro-hardening`  
Stack prod typique : **Render** (API) + **Neon** (PostgreSQL) + front (Render Static / autre).

## 1. Sauvegardes Neon (point-in-time)

1. Console Neon → projet ImmoPilot → **Branches** / **Restore**.
2. Neon conserve un historique PITR (durée selon plan) : choisir une **timestamp** avant l’incident.
3. Restaurer vers une **nouvelle branche** (jamais écraser `main` / prod à l’aveugle).
4. Pointer temporairement `DATABASE_URL` (staging) vers la branche restaurée, vérifier données + `npx prisma migrate status`.
5. Si OK : basculer le DNS / `DATABASE_URL` prod selon la procédure Neon (promote / swap), ou rejouer un export logique.

**Test mensuel obligatoire :** restaurer une copie sur branche `restore-drill-YYYYMM`, démarrer l’API en local/staging contre cette URL (jamais les scripts seed/assert sur Neon prod), vérifier login + un loyer + une quittance. Documenter date + auteur dans le journal d’incidents.

## 2. Rotation des secrets

| Secret | Où | Procédure |
|--------|-----|-----------|
| `JWT_SECRET` | Render env | Générer ≥32 chars aléatoires ; déployer ; **tous les utilisateurs sont déconnectés** (tokens invalides). |
| `DATABASE_URL` | Render + Neon | Reset password Neon → mettre à jour Render → redéployer immédiatement. |
| SMTP / S3 | Render | Mettre à jour, redéployer ; tester `npm run test:smtp` / upload contrat. |
| WebAuthn | `WEBAUTHN_RP_ID` / origin | Ne changer que si le domaine front change. |

Après rotation : smoke `/health`, `/version`, login admin, une écriture paiement.

## 3. Rollback déploiement Render

1. Dashboard Render → service API → **Events** / **Deploys**.
2. Sélectionner le déploiement **précédent stable** → **Rollback** (ou redéployer le commit git connu).
3. Si la cause est une **migration Prisma** incompatible : ne pas seulement rollback le code — restaurer le schéma (migration down manuelle **uniquement** si scriptée et testée) ou PITR Neon + redéployer un commit compatible.
4. Front : republier le build aligné (éviter API vN + front vN-1 si contrats cassés).

## 4. Checklist incident

1. **Constat** : symptômes, heure (Africa/Abidjan), URL, `x-request-id` si dispo, capture Sentry.
2. **Blast radius** : une org / toutes / auth / paiements / fichiers.
3. **Stabiliser** : rollback Render si régression récente ; sinon feature-flag / désactiver job si besoin.
4. **Données** : ne jamais `seed` ni `assert-local-db` contre Neon ; PITR si corruption.
5. **Com’** : informer le client (état + ETA) ; journal interne (quoi / quand / qui / correctif).
6. **Post-mortem** court sous 48 h : cause, détection, fix, prévention.

## 5. Monitoring

- Uptime : sonder `GET /health` (DB) et `GET /version`.
- Erreurs : `SENTRY_DSN` (API) + `VITE_SENTRY_DSN` (front) — absents = Sentry off.
- Job late-status : cron 06:00 Africa/Abidjan + `pg_try_advisory_lock` (une instance).

## 6. Déploiement API (rappel)

1. `npx prisma migrate deploy` (Render build/start ou job dédié).
2. `ENABLE_SCHEMA_BOOTSTRAP=false` une fois les migrations B5 appliquées partout.
3. Stockage : `STORAGE_DRIVER=s3` recommandé ; sinon `STORAGE_ALLOW_LOCAL=true` + disque persistant.
4. Obligatoire prod : `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_ORIGIN`, `PUBLIC_APP_URL`.
