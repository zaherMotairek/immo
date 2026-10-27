# ImmoPilot — Risques backend (Phase 7)

Date : 2026-10-27  
Branche : `refactor/design-system`  
Périmètre : inventaire **lecture seule** de `backend/src`, `backend/scripts`, `backend/prisma`, `ensure-admin` — **aucune correction implémentée**.

Ce document liste les risques observés avec références fichier/ligne, niveau de sévérité, et correctif minimal proposé.

---

## Tableau de sévérité

| # | Sujet | Niveau |
|---|--------|--------|
| 1 | Bootstraps SQL au démarrage vs migrations Prisma | **High** |
| 2 | Fallback `JWT_SECRET` | **High** |
| 3 | CORS permissif si `FRONTEND_ORIGIN` absent | **High** |
| 4 | Stockage uploads sur disque local | **Med** |
| 5 | Rate limiting / helmet / brute-force / reset MDP | **High** |
| 6 | Jetons publics de quittance (entropie / expiration) | **Low**–**Med** |
| 7 | Isolation multi-organisation | **Med** |
| 8 | Argent (Decimal), arrondis, fuseau Africa/Abidjan | **Med** |
| 9 | Absence de tests Jest sur services critiques | **High** |

---

## 1. Bootstraps SQL au démarrage vs migrations Prisma

**Niveau : High**

Au `onModuleInit`, `PrismaService` enchaîne cinq bootstraps SQL bruts (`$executeRawUnsafe`) **en plus** (ou à la place) de `prisma migrate deploy` :

```11:18:backend/src/prisma/prisma.service.ts
  async onModuleInit() {
    await this.$connect();
    await runImmeubleSchemaBootstrap(this);
    await runAuditSchemaBootstrap(this);
    await runAccountingClosureBootstrap(this);
    await runSignatureAndReceiptShareBootstrap(this);
    await runRentCollectionBootstrap(this);
  }
```

| Bootstrap | Fichier | Ce qu’il crée / altère | Déjà en migration Prisma ? |
|-----------|---------|------------------------|----------------------------|
| Grille logements / index unique | `immeuble-schema-bootstrap.ts` L12–40 | `ALTER buildings.apartments_per_floor` ; `DROP`/`CREATE UNIQUE INDEX` sur `units` | Oui : `prisma/migrations/20260424120000_apartments_per_floor_unit_slot_floor_unique/migration.sql` (doublon volontaire) |
| Journal d’audit | `audit-schema-bootstrap.ts` L7–31 | Table `audit_logs` + index | **Non** — absent de `schema.prisma` et des migrations |
| Clôtures comptables | `accounting-closure-bootstrap.ts` L7–24 | Table `accounting_period_closures` + index | **Non** |
| Signature + partage quittance | `signature-and-receipt-share-bootstrap.ts` L7–41 | Colonnes `receipt_signature_*` sur `organizations` ; table `receipt_share_tokens` | **Non** |
| Encaissement terrain | `rent-collection-bootstrap.ts` L7–64 | `rent_collectors`, `payment_collection_tasks`, `payment_collection_events` | **Non** |

**Risques :** schémas divergents entre environnements ; tables hors Prisma Client (requêtes raw partout) ; pas de rollback versionné ; `CREATE IF NOT EXISTS` masque les écarts ; pas de FK vers `organizations` / `payments` sur plusieurs tables bootstrap.

**Correctif minimal proposé (ne pas implémenter ici) :**

1. Pour chaque objet listé ci-dessus, générer une migration Prisma dédiée (SQL équivalent + modèles dans `schema.prisma` quand pertinent).
2. Migrer les appels `$queryRawUnsafe` / `$executeRawUnsafe` vers le client Prisma dès que les modèles existent.
3. Retirer les bootstraps de `onModuleInit` (ou les limiter à un no-op de garde en non-prod).
4. Documenter le déploiement : `prisma migrate deploy` obligatoire avant `start`.

---

## 2. Fallback `JWT_SECRET`

**Niveau : High**

Secret de signature JWT avec valeur par défaut en dur si la variable d’environnement est absente :

| Emplacement | Lignes |
|-------------|--------|
| `backend/src/auth/auth.module.ts` | L18 : `secret: config.get<string>('JWT_SECRET') \|\| 'dev-secret-change-me'` |
| `backend/src/auth/jwt.strategy.ts` | L20 : `secretOrKey: config.get<string>('JWT_SECRET') \|\| 'dev-secret-change-me'` |

Durée de vie des tokens : `expiresIn: '7d'` (`auth.module.ts` L19) — long pour un secret faible.

**Risque :** en production sans `JWT_SECRET`, n’importe qui connaissant la constante peut forger des JWT valides.

**Correctif minimal proposé :** au démarrage (factory JwtModule + JwtStrategy, ou `main.ts`), si `NODE_ENV === 'production'` et `!process.env.JWT_SECRET` (ou secret trop court), **échouer immédiatement** (`process.exit(1)` / throw) — pas de fallback. Conserver le fallback uniquement hors production.

---

## 3. CORS — comportement de repli en production

**Niveau : High**

```17:46:backend/src/main.ts
  const envOrigins = process.env.FRONTEND_ORIGIN?.split(',')...
  const corsOrigin =
    envOrigins?.length
      ? envOrigins
      : (origin: string | undefined, callback: ...) => {
          if (!origin) { callback(null, true); return; }
          // localhost, 127.0.0.1, 192.168.x, 10.x, 172.16–31.x → autorisés
        };
  app.enableCors({ origin: corsOrigin, credentials: true, ... });
```

Si `FRONTEND_ORIGIN` n’est **pas** défini : origines LAN / localhost acceptées, et requête **sans** en-tête `Origin` acceptée (`callback(null, true)` L22–24). Écoute sur `0.0.0.0` par défaut (`main.ts` L58).

**Risque :** déploiement prod oubliant `FRONTEND_ORIGIN` → surface CORS trop large (navigateur + outils) alors que l’API est exposée.

**Correctif minimal proposé :** en `NODE_ENV=production`, exiger `FRONTEND_ORIGIN` non vide ; sinon fail-fast. Ne jamais appliquer le callback « LAN » en prod.

---

## 4. Uploads sur disque local

**Niveau : Med**

Fichiers écrits sous `process.cwd()` + sous-dossier (`LEASE_CONTRACT_UPLOAD_SUBDIR` ou `'uploads'`) :

| Contenu | Fichier | Lignes clés |
|---------|---------|-------------|
| Contrats de bail | `leases/leases.service.ts` | L549–550 (`lease-contracts`), `writeFile` L639 |
| Pièces d’identité locataires | `tenants/tenants.service.ts` | L105–107 (`tenant-id-docs`), `writeFile` L188 |
| Signatures de quittance | `auth/auth.service.ts` | L186–188 (`receipt-signatures`), `writeFile` L234 |
| Import Excel | mémoire Multer (`reports.controller.ts`) — pas de persistance fichier durable | — |

Limites partielles : MIME + taille contrats (`lease-contract.constants.ts`, max 15 Mo) ; signatures max 2 Mo (`auth.service.ts` L228–229).

**Risques :** perte de fichiers au redéploiement / instance éphémère (Render, etc.) ; pas de backup objet ; scaling multi-instances incohérent ; disque saturé.

**Correctif minimal proposé :** stocker dans un object storage (S3 / R2 / GCS) avec clés préfixées `{organizationId}/…` ; conserver en base uniquement la clé + métadonnées ; définir une politique de backup / rétention. Garder le disque local uniquement en `NODE_ENV !== 'production'`.

---

## 5. Rate limiting, helmet, brute-force, tokens reset MDP

**Niveau : High** (auth réseau) · **Low** (qualité du token reset)

### Constats

- **Pas** de `helmet`, **pas** de `@nestjs/throttler` / rate-limit dans `backend/package.json` (dépendances L28–47).
- Aucune garde dans `main.ts` (pas de middleware sécurité HTTP).
- `POST /auth/login` (`auth.controller.ts` L18–21) : aucune limitation de tentatives, pas de lockout, pas de délai progressif.
- `POST /auth/forgot-password` et `POST /auth/reset-password-token` (`auth.controller.ts` L23–31) : idem, ouverts sans throttle.

### Reset mot de passe — points positifs

| Aspect | Détail | Réf. |
|--------|--------|------|
| Entropie | `randomBytes(32).toString('hex')` (256 bits) | `auth.service.ts` L147 |
| TTL | `PASSWORD_RESET_TTL_MS = 60 * 60 * 1000` (1 h) | L19, L148 |
| Usage | Vérifie `expiresAt: { gt: new Date() }` ; suppression après usage | L169–182 |
| Anti-énumération | Message générique si e-mail inconnu | L143–145, L308–309 |

### Risque annexe build : `ensure-admin`

`backend/scripts/ensure-admin.cjs` L13–14 : mot de passe par défaut `AdminImmo2026!` si `SEED_ADMIN_PASSWORD` absent ; exécuté au `build` (`package.json` L12). Compte `PLATFORM_ADMIN` upserté à chaque build.

**Correctifs minimaux proposés :**

1. Ajouter `helmet()` dans `main.ts`.
2. `@nestjs/throttler` (ou équivalent) : ex. 5 req/min sur `/auth/login`, `/auth/forgot-password`, `/auth/reset-password-token`.
3. Optionnel : compteur d’échecs login par IP/e-mail (Redis) après N échecs.
4. Garder TTL 1 h ; optionnel : hasher le token en base (store hash, compare timing-safe).
5. `ensure-admin` : en production, exiger `SEED_ADMIN_PASSWORD` (pas de défaut) ; ne pas réécraser le hash à chaque build si le compte existe déjà (sauf flag explicite).

---

## 6. Jetons publics de quittance — entropie et expiration

**Niveau : Low** (entropie) · **Med** (durée de vie / réutilisation)

| Aspect | Implémentation | Réf. |
|--------|----------------|------|
| Création | `randomUUID()` × 2 concaténés (sans tirets) ≈ 64 hex / ~256 bits | `payments.service.ts` L1379 |
| Expiration | 72 h (`72 * 60 * 60 * 1000`) | L1380 |
| Endpoint public | `GET /public/payments/receipts/:token` | `payments.public.controller.ts` L9–15 |
| Contrôle expiry | `expiresAt.getTime() <= Date.now()` → null | `payments.service.ts` L1448–1449 |
| Après usage | **Pas** de suppression / one-shot : le lien reste valide jusqu’à expiration | L1436–1449 |
| Table | Créée uniquement via bootstrap (hors migrations) | `signature-and-receipt-share-bootstrap.ts` L21–38 |

**Risques :** fuite du lien (WhatsApp, historique) → quittance téléchargeable pendant 72 h ; pas de rate-limit sur l’endpoint public ; schéma hors Prisma.

**Correctif minimal proposé :** migrer `receipt_share_tokens` en migration Prisma ; optionnellement one-shot (`DELETE` ou `used_at` au premier GET) ; réduire TTL (ex. 24 h) si le métier le permet ; throttle sur `public/payments`.

---

## 7. Isolation organisation (`organizationId`)

**Niveau : Med**

### Pattern global (bon)

Les contrôleurs métier passent systématiquement `user.organizationId` aux services (ex. `payments.controller.ts`, `leases.controller.ts`, `buildings.controller.ts`, `tenants.controller.ts`, `charges.controller.ts`, `search.controller.ts`, `reports.controller.ts`, `collectors.controller.ts`, `audit.controller.ts`, `dashboard.controller.ts`).  
`JwtStrategy.validate` refuse un JWT dont `payload.organizationId` ≠ org courante de l’utilisateur (`jwt.strategy.ts` L37–38).

Admin plateforme (`admin.controller.ts` + `PlatformAdminGuard`) : accès **volontairement** cross-org.

### Requêtes / écritures **sans** filtre `organizationId` (écarts)

| Emplacement | Comportement | Sévérité |
|-------------|--------------|----------|
| `payments.service.ts` L46–55 `syncLateStatuses` | `payment.updateMany` sur **toutes** les orgs (PENDING → LATE) | **Med** — écriture cross-tenant à chaque list/dashboard/rapport |
| `buildings/apartments-per-floor-column.ts` L17–19, L49–58 | `SELECT`/`UPDATE` `buildings` par `id` seul (pas `organization_id`) | **Low** si toujours précédé d’un `ensure` org ; fragile si réutilisé |
| Après `ensure(id, organizationId)` | `findUnique` / `update` / `delete` par `id` seul (ex. `payments.service.ts` L253, L312, L347 ; `tenants.service.ts` L71, L85–88 ; `buildings.service.ts` L211) | **Low** — pattern courant ; course théorique TOCTOU |
| `leases.service.ts` L111–113, L396–398, L812–818 | Paiements filtrés par `leaseId` déjà scoppé org | **OK** |
| `excel-import.service.ts` L211–216 `ensureBuildingImmeuble` | `findUnique` / `update` par `buildingId` | **Low** — ID issu de `findOrCreate` org |
| Auth login / reset (`auth.service.ts` L57, L140, L169) | Lookup user / token global | **OK** (auth) |
| Quittance publique (`payments.service.ts` L1437–1449) | Lookup par token | **OK** (lien public) |

**Correctif minimal proposé :**

1. Ajouter `organizationId` (via jointure lease→unit→building) à `syncLateStatuses`, ou accepter un paramètre org et n’appeler que la variante scopée depuis les routes tenant.
2. Ajouter `AND organization_id = $2` aux helpers SQL `apartments-per-floor`.
3. Préférer `update({ where: { id, …orgScope } })` plutôt que `ensure` + update par id seul sur les chemins sensibles (paiements, baux).

---

## 8. Argent : Decimal, arrondis, fuseau (Africa/Abidjan = UTC)

**Niveau : Med**

### Schéma

Montants en `Decimal(12, 2)` : loyers, cautions, paiements, charges (`schema.prisma` — ex. Unit L132–134, Lease L177–178, Payment L231–234, Charge L287).

### Runtime

| Point | Détail | Réf. |
|-------|--------|------|
| Conversion | `toNumber()` → `number` JS (IEEE 754) | `common/decimal.util.ts` L1–5 |
| Calculs paiements | `amountDue.toNumber()`, `amountPaid?.toNumber()`, epsilon `0.005` | `payments.service.ts` L321–335, L388–392 |
| Affichage | `Math.round(...)` FCFA | ex. L331, L567 |
| Agrégats | `reduce` sur `.toNumber()` (prépay) | `leases.service.ts` L844 |

**Risque :** précision flottante sur sommes / comparaisons (atténué par échelle 2 décimales et `eps`, mais fragile pour agrégats).

**Correctif minimal proposé :** garder les calculs en `Prisma.Decimal` (ou centimes entiers) jusqu’à la sérialisation API ; arrondir explicitement à 0 décimales FCFA à la frontière d’écriture.

### Dates d’échéance / statut LATE

| Utilitaire | Comportement | Réf. |
|------------|--------------|------|
| `rentDueDate` | `Date.UTC(year, month-1, day)` | `common/date.util.ts` L1–6 |
| `startOfTodayUtc` / `addDaysUtc` | Jour civil en **UTC** | L19–27 |
| `syncLateStatuses` | `dueDate < startOfTodayUtc()` → LATE | `payments.service.ts` L46–54 |
| Dashboard « mois courant » | `now.getFullYear()` / `getMonth()` = **fuseau du serveur** (local), pas UTC | `dashboard.service.ts` L38–40 |

**Africa/Abidjan** = UTC sans heure d’été : les helpers UTC sont alignés **si** le serveur tourne en UTC. Si le host est en autre fuseau, le « mois courant » dashboard et `addOneYearSameDay` (`date.util.ts` L33–40, dates locales) peuvent diverger d’un jour / mois.

**Correctif minimal proposé :** documenter `TZ=UTC` (ou `Africa/Abidjan`) en prod ; remplacer `getFullYear`/`getMonth` locaux du dashboard par UTC ; unifier `addOneYearSameDay` en UTC.

---

## 9. Tests manquants — suite Jest minimale proposée

**Niveau : High** (dette qualité)

- Aucun fichier `*.spec.ts` / `*.test.ts` sous `backend/`.
- Aucun script `test` ni dépendance Jest / `@nestjs/testing` dans `backend/package.json`.

### Suite minimale proposée (ne pas implémenter ici)

| Fichier proposé | Cible | Cas critiques |
|-----------------|-------|---------------|
| `payments.service.spec.ts` | `PaymentsService` | `update` + `addAmountPaid` (partiel / complet / dépassement) ; `waiveRent` (motif, statuts refusés) ; `syncLateStatuses` (PENDING passé → LATE) ; `createReceiptShareLink` + `buildReceiptPdfFromShareToken` (expiré / valide) |
| `leases.service.spec.ts` | `LeasesService` | `generatePayments` (idempotence période) ; `prepayNextMonths` (1–12, refus si pas assez d’échéances) ; cloisonnement org sur `get` / `create` |
| `reports.service.spec.ts` | Clôtures | `closeAccountingPeriod` / `openAccountingPeriod` (unicité org+année+mois) |
| `auth.service.spec.ts` | Auth | login invalide ; reset token expiré / valide ; fail si JWT secret manquant en prod (si garde ajoutée) |

Infrastructure : Jest + `@nestjs/testing` + Prisma mock ou DB de test ; exécution CI sur PR.

---

## Synthèse des priorités

1. **Immédiat prod :** fail-fast `JWT_SECRET` + `FRONTEND_ORIGIN` ; throttle `/auth/*` ; helmet.  
2. **Court terme :** migrations Prisma pour les 4 bootstraps hors schéma ; object storage uploads.  
3. **Moyen terme :** scoper `syncLateStatuses` ; Decimal jusqu’à la sérialisation ; suite Jest minimale ci-dessus.
