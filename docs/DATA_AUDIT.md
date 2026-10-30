# ImmoPilot — Audit « single source of truth » (Phase A)

Date : 2026-10-30  
Branche : `feat/pro-hardening`  
Périmètre : lecture code + tests de caractérisation (comportement **actuel**, sans correctif métier).

---

## 1. Tableau des chiffres métier

Légende **Alignement** : `OK` = même définition ; `DIVERGE` = formules / filtres différents ; `UI-only` = recalcul front ; `N/A` = pas exposé.

| Chiffre | Backend (source) | Frontend (affichage) | Alignement |
|--------|------------------|----------------------|------------|
| Loyer mensuel attendu (baux actifs) | `DashboardService.overview` → `kpis.expectedMonthlyRent` = `sum(lease.monthlyRent)` actifs | `Dashboard` / `ParkSection` / anneau finance | OK (un seul endpoint overview) |
| Encaissé ce mois | `overview` : somme `amountPaid` (ou `amountDue` si PAID sans amountPaid) sur échéances `periodYear/Month` = mois civil **machine** | `FinanceSection` `collectedThisMonth` | OK via overview ; **attention** : mois = fuseau serveur/`Date` local API, pas explicitement Africa/Abidjan |
| Reste vs attendu (dashboard) | Calculé **front** : `max(0, expectedMonthlyRent - collectedThisMonth)` | `DashboardPage` / pie | UI-only — pas de champ backend dédié |
| Impayés (count / montant) | `overview.kpis.overdueCount` / `overdueAmount` : LATE ou PENDING avec `dueDate < todayUtc` ; reste = `max(0, due - paid)` | Dashboard alertes | OK via overview |
| Liste paiements (filtre) | `PaymentsService.list` (filtre org + syncLate) | `Paiements` | OK |
| Synthèse filtres Paiements | Totaux **recalculés côté front** sur la liste filtrée (`PaymentsSummary`) | Paiements | DIVERGE vs dashboard : périmètre = filtre UI, pas le mois civil dashboard |
| Reste d’une échéance | Backend détail : `due - paid` ; front locations/paiements souvent `amountRemaining` ou recalcul | Locations, Paiements | DIVERGE possible si front ignore partiels |
| Cautions encaissées (mois) | `overview.depositsCollectedThisMonth` : baux avec `depositPaidAt` dans le mois UTC + `depositAmount > 0` | Dashboard | OK |
| Cautions (liste) | `LeasesService.listDepositsCollected` | page Cautions | OK (endpoint dédié) — **≠** KPI dashboard (filtre date différent) |
| Charges | `ChargesService` (si présent) / rapports | Comptabilité / charges | À unifier en Phase C7 |
| Taux d’occupation | Front biens / stats locaux (`buildingStats`, unités avec bail) | Biens | UI-only / local — pas de KPI overview |
| Clôture comptable | tables bootstrap `accounting_period_closures` + services reports | Comptabilité | Hors Prisma Client — risque d’écart (voir BACKEND_RISKS) |
| Relances | `PaymentReminder` / log | Paiements | Pas de total unique « à relancer » serveur pour Aujourd’hui |

---

## 2. Données redondantes / qui peuvent dériver

| Zone | Stocké | Dérivable / risque |
|------|--------|-------------------|
| Building `floorCount`, `apartmentCount`, `apartmentsPerFloor`, `rezApartmentCount`, `locauxSlotCount`, `terrainLotCount` | Oui (déclaratif) | Peut différer du **nombre réel** de lignes `Unit` ; UI génération auto / validation partielle |
| `Payment.status` LATE vs `dueDate` | Oui | `syncLateStatuses` met à jour en masse ; lecture peut encore voir PENDING périmé si sync non appelée |
| `amountPaid` vs `status=PAID` | Oui | overview utilise fallback `amountDue` si PAID sans `amountPaid` — historique incohérent possible |
| `Lease.monthlyRent` vs `Payment.amountDue` | Copie à la génération | Révision de loyer **ne met pas à jour** les échéances déjà créées (comportement actuel) |
| Compteurs « lots libres » | Front + baux actifs | Recalculs multiples (Baux / Biens) |

**Double saisie utilisateur :**

- Structure déclarée (nb étages / lots) **puis** création manuelle ou tableau d’unités.
- Locataire créé dans Baux (rapide) **et** fiche Locataires.
- Date / loyer saisis par lot en bulk **et** éventuellement repris sur la fiche bail.

---

## 3. `syncLateStatuses`

| Question | Constat |
|----------|---------|
| Où appelé ? | `PaymentsService.list`, `sendOverdueReminder`, `logReminder` ; `DashboardService.overview` ; `LeasesService` (list overview / fiche) ; `ReportsService` (plusieurs exports) ; `excel-import` |
| Sur GET ? | **Oui** — list paiements, overview dashboard, certaines listes baux / reports |
| Scope org ? | **Non** — `updateMany` global `PENDING` + `dueDate < today` **toutes organisations** |
| Perf ~10k payments | Un seul `updateMany` indexé sur `status`+`dueDate` : acceptable en volume moyen ; sous charge multi-tenant concurrent, contention + écritures croisées orgs (à corriger Phase B6/B7) |

Test de caractérisation : un paiement 2020-01 PENDING devient LATE après `syncLateStatuses`.

---

## 4. Argent & dates (constat Phase A)

- Montants Prisma `Decimal` en base ; conversions fréquentes via `.toNumber()` + epsilon `0.005` dans `PaymentsService.update` (partiels) — **pas** du FCFA entier strict bout-en-bout.
- `startOfTodayUtc` / échéances : UTC ; `addOneYearSameDay` utilise `Date` **local** (fuseau machine) — écart potentiel vs Africa/Abidjan.
- Pas de `FinanceSummaryService` unique (cible Phase C7).

---

## 5. Isolation org (échantillon testé)

Services couverts par tests : `PaymentsService.get/list`, `LeasesService.get`, `BuildingsService.get`, `TenantsService.get`.  
**Non couvert encore** : chaque controller HTTP, admin plateforme, collecteurs, search, exports PDF/Excel, quittances publiques — à étendre Phase B.

---

## 6. Found, not fixed

1. `syncLateStatuses` non scopé par `organizationId` + déclenché sur plusieurs GET.
2. Epsilon flottant `0.005` sur montants FCFA.
3. KPI « encaissé vs attendu » : mois civil côté API vs filtres libres page Paiements.
4. Champs structure Building vs rows `Unit` peuvent diverger.
5. Couverture isolation « every controller » incomplète (échantillon services seulement).
