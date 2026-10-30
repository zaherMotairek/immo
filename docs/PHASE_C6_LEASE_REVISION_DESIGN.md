# C6 — Design : fin de bail, renouvellement, révision de loyer

**Statut :** design only — **ne pas implémenter** le modèle tant que non approuvé.

## Objectifs produit

1. Alerter les baux qui se terminent (déjà listés dans Aujourd’hui / C5 via `endDate`).
2. Proposer un **renouvellement** (nouveau bail ou prolongation).
3. Proposer une **révision de loyer** (% ou montant) sans écraser l’historique des échéances déjà soldées.

## Options de modèle (à choisir)

### Option A — Amendement léger (recommandée pour v1)

| Table / champ | Rôle |
|---------------|------|
| `Lease.endDate` | prolongé |
| `Lease.monthlyRent` | nouveau loyer à partir d’une date |
| `LeaseRentRevision` (nouvelle) | `leaseId`, `effectiveFrom` (date), `previousRent`, `newRent`, `percent`, `note`, `createdBy`, `createdAt` |

- Les échéances **PENDING/LATE** à partir de `effectiveFrom` sont resync via `resyncMutablePaymentsFromLeaseTerms`.
- Les **PAID/WAIVED** restent intouchables.
- Pas de nouveau `Lease` id → historique caution / collecteurs simples.

### Option B — Nouveau bail (période)

- Clôturer le bail (`active=false`, `endDate=jour J`).
- Créer un nouveau `Lease` sur la même unité + même locataire, `startDate=J+1`, nouveau loyer.
- Migrer ou laisser les quittances liées à l’ancien id.

**Impact :** plus clair juridiquement ; plus de UI (transfert caution, historique croisé).

## UX proposée (après GO modèle)

1. Fiche bail → « Renouveler / réviser » → wizard : date, % ou montant, aperçu 3 échéances.
2. Aujourd’hui → deep-link sur les items `lease_ending`.
3. Audit : `LEASE_RENT_REVISED` / `LEASE_RENEWED`.

## Décision attendue

Choisir **A** ou **B** (ou hybride : A pour révision, B pour changement de locataire uniquement).
