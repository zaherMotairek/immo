# Prompt 1 — `fix/design-polish` (STOP)

Branche : `fix/design-polish` (base `main`).  
Périmètre : UI uniquement — pas de logique métier, API ni schéma DB.

## Checklist des 8 points

| # | Sujet | Statut | Détail |
|---|--------|--------|--------|
| 1 | Sidebar desktop — logo ImmoPilot | Fait | En-tête sur deux lignes (marque puis thème + Masquer), sans troncature du nom. |
| 2 | Recherche mobile — placeholder | Fait | `Rechercher…` ; raccourci clavier dans `title` et badge `kbd` (desktop). |
| 3 | Montants F CFA | Fait | `fcfa()` → groupes avec espace fine insécable + `F CFA` ; PDF `formatFcfaPdf` ; champs `MoneyInput` / libellés. |
| 4 | Pluriels français | Fait | `pluralFr()` ; baux, échéances, import Excel, toolbars. |
| 5 | Dashboard mobile | Fait | KPI finance en premier ; héros compact ; parc masqué &lt; lg ; camembert masqué &lt; lg. |
| 6 | Barre bas — onglet Plus | Fait | Baux dans la barre ; Locataires dans Plus ; `moreIsActive` sans `/baux`. |
| 7 | Baux / Paiements — empilement | Fait | Filtres déjà repliés ; toolbar baux masquée &lt; sm ; synthèse paiements allégée sur mobile. |
| 8 | Général (touch / typo) | Partiel | `min-h-11` sur actions sidebar / recherche ; pas de passe globale sur tout le design system. |

## Fichiers touchés (principal)

- `frontend/src/lib/format.ts`
- `frontend/src/components/Layout.tsx`, `GlobalSearchBar.tsx`, `usePartialPayment.ts`, `ui/MoneyInput.tsx`
- `frontend/src/pages/Dashboard/*`, `Leases/*`, `Payments/PaymentsSummary.tsx`, `PaymentsPage.tsx`, `ExportsPage.tsx`
- `backend/src/common/immo-pdf.ts` (libellé montant PDF uniquement)

## Vérifications

```text
npm run check   → OK (lint, build front, typecheck + build API)
```

Captures Playwright mobile 390 / desktop 1440 (clair + sombre) : **non exécutées dans cette session** — lancer `npm --prefix frontend run e2e:screenshots` avec API + front en marche si besoin pour la PR.

## Suite proposée

1. Revue locale rapide (Accueil, Baux, Paiements, barre bas mobile).
2. Sur votre **GO** : commit, push `fix/design-polish`, PR vers `main` (sans merge).

**Note :** cette branche part de `main`, pas de `feat/pro-hardening` — les features E/F1 ne sont pas incluses ici.