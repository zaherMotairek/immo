# Phase F — Rôles & propriétaires (design only)

**Statut :** F1 **implémenté** (2026-10-30) — F2 toujours design only / reporté.  
**Date :** 2026-10-30

## F1 — Rôles dans une organisation

### Constat actuel (`UserRole`)

| Rôle Prisma | Périmètre aujourd’hui |
|-------------|------------------------|
| `USER` | Tout le produit métier d’**une** organisation |
| `PLATFORM_ADMIN` | Back-office multi-clients (`/admin`), jamais bloqué par licence org |

Pas de rôles *intra-org* (gérant / comptable / collecteur / lecture seule). Le modèle « Collecteur » existe comme **entité terrain** (`rent_collectors`), pas comme compte utilisateur limité. Impersonation admin (D3) = lecture seule globale indépendante des rôles org.

### Matrice proposée — capacités (cible)

| Capacité | Owner / Gérant | Comptable | Collecteur (compte) | Lecture seule |
|----------|----------------|-----------|---------------------|---------------|
| Biens / unités CRUD | oui | non | non | lecture |
| Locataires / baux CRUD | oui | lecture + caution | non | lecture |
| Encaisser loyer | oui | oui | oui (assigné) | non |
| Relances | oui | oui | limité | non |
| Exports / clôtures | oui | oui | non | exports agrégés ? |
| Automation / profil org | oui | non | non | non |
| Inviter users | oui | non | non | non |
| Admin plateforme | non | non | non | non |

### Matrice proposée — écrans UI

| Écran / route | Owner | Comptable | Collecteur | Lecture |
|---------------|-------|-----------|------------|---------|
| Dashboard `/` | plein | plein | aperçu assigné | lecture |
| Biens `/biens` | CRUD | lecture | masqué / lecture limitée | lecture |
| Locataires `/locataires` | CRUD | lecture + docs | lecture assignés | lecture |
| Baux `/baux`, Locations | CRUD + révision | lecture + caution | lecture | lecture |
| Paiements `/paiements` | encaisser | encaisser | encaisser (assigné) | lecture |
| Relances | oui | oui | limité (assigné) | non |
| Charges / compta | oui | oui | non | lecture |
| Collecteurs (entité) | CRUD | lecture | non | lecture |
| Export / import `/exports` | oui | oui | non | export seul ? |
| Profil / automation | oui | non | non | non |
| Admin `/admin` | non (sauf PLATFORM_ADMIN) | non | non | non |

### Matrice proposée — endpoints Nest (groupes)

Légende : `W` = write, `R` = read, `—` = 403, `A` = assigné seulement.

| Groupe API | Owner | Comptable | Collecteur | Lecture |
|------------|-------|-----------|------------|---------|
| `GET/POST/PATCH/DELETE /buildings`, units | W | R | — / R? | R |
| `GET/POST/PATCH/DELETE /tenants` (+ id docs) | W | R (+ caution docs?) | R (A) | R |
| `GET/POST/PATCH/DELETE /leases`, revise, generate-payments | W | R (+ caution) | R (A) | R |
| `GET /payments`, collect, bulk, statement | W | W | W (A) | R |
| `POST …/send-reminder`, `/reminders` | W | W | W (A) limité | — |
| `GET/POST /charges`, closures | W | W | — | R |
| `GET/POST /collectors` (entité) | W | R | — | R |
| `GET /reports/*`, `POST import.xlsx` | W | W (import ?) | — | R export |
| `GET/PATCH /automation` | W | — | — | — |
| `GET /me/entitlements`, `/me/onboarding` | R | R | R | R |
| ` /admin/*` | — | — | — | — |

### Impact technique (estimation)

- Nouveau enum `OrgMemberRole` (`OWNER` \| `ACCOUNTANT` \| `COLLECTOR` \| `READONLY`) + table `organization_memberships` **ou** champ `User.orgRole` (1 user = 1 org aujourd’hui → champ suffit pour v1).
- Guards Nest `@RequireOrgPerm('leases:write')` + map rôle → perms.
- Front : masquer nav / boutons selon perms (étendre `GET /me/entitlements`).
- Migration additive ; grandfather : users existants → `OWNER`.
- Compte Collecteur peut lier optionnellement `rent_collectors.id`.

### Risques

- Collecteur *entité* vs *compte* : ne pas confondre.
- Impersonation admin (D3) reste lecture seule globale.
- Downgrade OWNER → READONLY : données inchangées, UI/API bloquées.

---

## F2 — Module « Propriétaires » (agences)

**Priorité basse** : client cible actuel = propriétaire autogéré.

### Objectif

Agences gérant le patrimoine d’autrui : entité Owner, lien bien↔owner, % honoraires, relevé mensuel, suivi des reversements.

### Artefacts existants à réutiliser

- `shared/contracts/src/owners.ts` : `Owner`, mandates, payouts, list params — **contrat API futur**, pas encore de tables Prisma Owner dédiées. Vocabulaire anglo (`tenant_id`, `commission`) à aligner CI (« bailleur / mandat / honoraires »).
- Biens déjà cloisonnés par `organizationId` (l’agence = org).

### Modèle proposé (v1 design)

| Entité | Champs clés |
|--------|-------------|
| `Owner` | orgId, type, name, contacts, taxId |
| `BuildingOwner` / mandate | buildingId, ownerId, fee%, start/end, status |
| `OwnerPayout` | period, amount, status, method, paidAt |
| `OwnerStatement` | agrégat loyers − honoraires − charges (PDF) |

### UX

- Menu « Propriétaires » (si plan PRO + feature `owners`).
- Fiche owner : mandats, biens, relevés, paiements.
- Relevé mensuel généré depuis `FinanceSummaryService` filtré owner.

### Décision attendue

1. Implémenter **F1** (rôles) avant F2 ?
2. F2 en MVP (owner + fee + PDF) ou reporter ?
3. Renommer contrats `shared/contracts` vs vocabulaire « bailleur / mandat » CI ?
