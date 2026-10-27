# ImmoPilot — UI Audit (Phase 1)

Date : 2026-10-27  
Branche : `refactor/design-system`  
Baselines : `frontend/e2e/baselines/{mobile|desktop}/{light|dark}/` (Phase 0, 76 PNG)  
Périmètre : **lecture seule** — aucun changement de logique métier.

---

## 1. Sources de design (conflit)

| Source | Emplacement | Statut |
|--------|-------------|--------|
| Thème réel « Odoo-like » monochrome | `src/index.css` (~846 lignes) + `src/theme/odoo.css` (~625 lignes) + utilitaires Tailwind | **Source de vérité actuelle** |
| Palette jaune « KIZ » / autre projet | `frontend/__design-doc/design-system.json`, `design.json`, `design.generic.json`, `DesignThinking.md` | Contradictoire, non appliquée |
| Règles Cursor design | `frontend/.cursor/rules/` : `ui-ux-design.mdc`, `ui-visual-validator.mdc`, `design.json`, `design.generic.json`, + `frontend-developer.mdc`, `frontend-seperation-of-concerns.mdc` | 6 fichiers ; pas alignés sur le thème live |
| Login / marque | Accents ambre/or sur `AuthShell` + logo | Sous-marque distincte du chrome app |

**Conclusion :** pas de design system unique. Phase 2 devra archiver les docs contradictoires et poser tokens + `DESIGN_SYSTEM.md`.

---

## 2. Inventaire des routes

Routes depuis `frontend/src/App.tsx` → page → composants principaux → appels API (chemins relatifs côté client).

| Route | Page | Composants clés | API / helpers |
|-------|------|-----------------|---------------|
| `/login` | `LoginPage.tsx` | `AuthShell`, `InstallAppButton`, `ui` Button/Input/Label | `useAuth().login` → `POST /auth/login` |
| `/mot-de-passe-oubli` | `ForgotPasswordPage.tsx` | `AuthShell`, `ui` | `POST /auth/forgot-password` |
| `/reinitialiser-mot-de-passe` | `ResetPasswordPage.tsx` | `AuthShell`, `ui` | `POST /auth/reset-password-token` |
| `/` (index) | `DashboardPage.tsx` | `AppPageTitle`, KPI icons, Recharts, `PaymentZoomModal`, `PdfPrintButton`, `EmptyState` | `GET /dashboard` |
| `/locations` | `LocationsPage.tsx` | `AppPageTitle`, `SmartLink`, table/cartes, `SortableTh` | `GET /leases/overview`, `DELETE /leases/:id` |
| `/locations/:id` | `LocationDetailPage.tsx` | `PageDetailHero`, `OdooNotebook`, `LeaseContractSection`, `AmountFcfaInput` | `GET /leases/:id/fiche`, `PATCH/DELETE /leases/:id`, `POST /payments/:id/waive`, `POST /leases/:id/prepay-months` |
| `/biens` | `BuildingsPage.tsx` | `AppPageTitle`, `OdooKit` (toolbar/kanban), `StatTile`, `Select` | `GET/POST /buildings`, `DELETE /buildings/:id` |
| `/biens/:id` | `BuildingDetailPage.tsx` | `PageDetailHero`, `OdooNotebook`, `Select`, `StatTile`, table unités | `GET/PATCH/DELETE /buildings/:id`, `POST /buildings/:id/units`, `PATCH/DELETE /units/:id` |
| `/immeubles`, `/immeubles/:id` | redirects | → `/biens` | — |
| `/locataires` | `TenantsPage.tsx` | `OdooKit` list/kanban, `TenantIdDocumentSection`, `BuildingUnitStack` | `GET/POST/PATCH/DELETE /tenants` |
| `/baux` | `LeasesPage.tsx` | `OdooActionBar`, `OdooTabBar`, `LeaseContractSection`, `AmountFcfaInput` | `GET /leases`, `/buildings`, `/tenants` ; `POST /leases` ; `PATCH /leases/:id` ; `POST /leases/:id/generate-payments` ; `POST /tenants` |
| `/paiements` | `PaymentsPage.tsx` | `SearchableSelect`, `PaymentZoomModal`, `OdooActionBar`, `AmountFcfaInput`, liste mois | `GET /payments`, `/buildings`, `/tenants` ; `PATCH /payments/:id` |
| `/activite-loyers` | `YearlyRentActivityPage.tsx` | `AppPageTitle`, `Select`, calendrier/table | `GET /payments?…`, `/tenants`, `/buildings` |
| `/cautions` | `CautionsChargesPage.tsx` | `OdooTabBar` → sous-pages | — (shell) |
| `/cautions` (onglet cautions) | `CautionsEncaisséesPage.tsx` | table, `FicheLocationLink` | `GET /leases/deposits-collected` |
| `/cautions?tab=charges` / `/charges`→ | `ChargesPage.tsx` | `OdooActionBar`, `AmountFcfaInput` | `GET /charges`, `/charges/summary`, `/buildings` ; `POST/PATCH/DELETE /charges` |
| `/exports` | `ExportsPage.tsx` | `ui`, helpers rapports | `downloadReport` → `/reports/summary.pdf|xlsx` ; import Excel |
| `/comptabilite` | `ComptabilitePage.tsx` | `OdooTabBar`, `StatTile`, tables | `getAccountingWorkspace/Summary/Closures`, close/open période |
| `/journal-securite` | `AuditLogPage.tsx` | `ui` + table | `getAuditLogs` → `/audit…` |
| `/collecteurs` | `CollectorsPage.tsx` | `OdooForm*`, cartes mobile + table | `GET/POST/PATCH /collectors` |
| `/profil` | `ProfilePage.tsx` | `OdooNotebook`, signature quittance | `GET/PATCH /auth/profile`, `POST /auth/change-password`, signature helpers |
| `/admin` | `AdminClientsPage.tsx` | `ui`, table orgs | `GET /admin/organizations`, `POST /admin/clients`, invite, reset-password, `PATCH` org |
| (chrome) | `Layout.tsx` | bottom nav, sheet Plus, `GlobalSearchBar`, `InstallAppButton` | — |
| (chrome) | `GlobalSearchBar.tsx` | portail résultats | `GET /search?q=` |
| (modal) | `PaymentZoomModal.tsx` | encaissement, relances, collecteurs | `GET/PATCH /payments/:id`, reminders, collection, `/collectors` |
| (modal route) | `LocationFicheSheet` + détail | panneau location | idem fiche |

---

## 3. Inventaire composants — doublons / quasi-doublons

### Kits UI parallèles
| Kit | Fichier | Exports notables | Usage |
|-----|---------|------------------|--------|
| **ui.tsx** | `components/ui.tsx` (~215 L) | `Button`, `Card`, `Input`, `Label`, `HelpHint`, `StatTile`, `AmountFcfaInput` | Quasi toutes les pages |
| **OdooKit.tsx** | `components/OdooKit.tsx` (~387 L) | `OdooActionBar`, forms, tabs, notebook, kanban, list toolbar | Biens, Locataires, Baux, Paiements, Profil, Collecteurs, etc. |

Les deux coexistent : une page typique importe **les deux**.

### Selects (×2, ~400 L chacun)
| Composant | Rôle | Pages |
|-----------|------|-------|
| `Select.tsx` | Dropdown custom (portal) wrappant `<select>` | Formulaires génériques, `ui` Select re-export ? (utilisé via `ui` et direct) |
| `SearchableSelect.tsx` | Recherche + liste | `PaymentsPage` (filtres) |

### Boutons / liens
- `ui.Button` vs `LinkButton` vs `<button>` natifs (Layout, toggles, filtres) vs `PdfPrintButton` vs `InstallAppButton`.
- `SmartLink` vs `react-router` `Link` / `NavLink` (Layout).

### En-têtes / états
- `AppPageTitle` + `PageHeaderKpi` vs `OdooSheetHeader` vs `PageDetailHero`.
- `EmptyState` (peu utilisé) vs textes ad hoc dans les pages.
- `AppLoadingScreen` vs skeletons pulse ad hoc (`BuildingDetailPage`).
- `StatTile` (ui) vs KPI dashboard custom vs `odoo-page-header-kpi`.

### Modales / overlays
- `PaymentZoomModal`, `LocationFicheSheet`, dropdowns portal (`Select`, `SearchableSelect`, `GlobalSearchBar`) — pas de `Modal` / `BottomSheet` / `ConfirmDialog` / `Toast` unifiés → **53** `alert()`/`confirm()`.

---

## 4. Comptages (src/**/*.ts{,x})

Comptage automatique (balises natives + patterns) :

| Pattern | Total approx. |
|---------|----------------|
| `<button` | **74** |
| `<input` | **14** |
| `<select` | **6** (souvent dans `Select.tsx` sr-only / fallback) |
| `<table` | **18** |
| `alert(` | **42** |
| `confirm(` | **11** |
| **alert + confirm** | **53** (cible Phase 3) |
| `style={` | **11** |
| hex `#…` | **20** (surtout charts Dashboard, logo) |
| `text-[Npx]` | **177** (dont beaucoup `text-[10px]` / `text-[11px]`) |

### Top fichiers (densité)

| Fichier | Lignes | button | table | alert/confirm | text-[Npx] |
|---------|--------|--------|-------|---------------|------------|
| `BuildingDetailPage.tsx` | 2700 | 5 | 2 | 11 | 10 |
| `PaymentsPage.tsx` | 1528 | 10 | 1 | 3 | 23 |
| `LeasesPage.tsx` | 1482 | 6 | 1 | 2 | 14 |
| `DashboardPage.tsx` | 1032 | 3 | 1 | 0 | 20 |
| `BuildingsPage.tsx` | 1007 | 10 | 1 | 2 | 11 |
| `LocationDetailPage.tsx` | 918 | 0 | 1 | 5 | 6 |
| `TenantsPage.tsx` | 876 | 9 | 1 | 2 | 3 |
| `PaymentZoomModal.tsx` | 597 | 1 | 0 | 5 | 14 |
| `api.ts` | 594 | 0 | 0 | 10 (`alert` erreurs download) | 0 |
| `GlobalSearchBar.tsx` | 695 | 2 | 0 | 0 | 7 |

Pages > 800 L : **7** fichiers « géants » (cible Phase 4 découpage).

---

## 5. CSS `index.css` / `odoo.css`

| Fichier | Lignes | Classes détectées | Utilisées (heuristique) | Peu/pas référencées |
|---------|--------|-------------------|-------------------------|---------------------|
| `index.css` | ~846 | 62 | ~60 | `odoo-form-grid`, `safe-pb` |
| `odoo.css` | ~625 | 39 | ~39 | — |

**Chevauchement de noms** (définis dans les deux fichiers) :  
`dark`, `odoo-btn-primary`, `odoo-btn-secondary`, `odoo-page-header-kpi`, `odoo-page-header__actions`, `odoo-page-header__bar`, `odoo-page-header__subtitle`, `odoo-page-header__title`  
→ risque de cascade confuse / duplication de règles.

Beaucoup de style vit aussi en **classes Tailwind longues** répétées (`dark:…`) hors de ces fichiers — non centralisé.

---

## 6. Problèmes mobile (baselines Phase 0)

Références : `frontend/e2e/baselines/mobile/light/*.png` (et dark équivalents).

| Page / écran | Constats (mobile 390×844) |
|--------------|---------------------------|
| **Login** | Marque forte OK ; bouton Install encore présent ; contraste header sombre / carte claire OK |
| **Dashboard** | KPI + graphiques denses ; alertes en liste (déjà amélioré) ; bottom nav OK |
| **Paiements** | Synthèse = **pile de cartes KPI** très haute avant le détail ; filtres année/mois prennent beaucoup de viewport ; détail mois compact OK |
| **Biens** | Liste cartes lisible ; toolbar (recherche + Liste/Kanban + PDF + chips genre) **encombrée** ; « + Ajouter » large |
| **Locataires / Baux** | Même pattern toolbar + formulaire/collapse ; tables desktop encore présentes au-delà de `md` |
| **Bien détail** | Formulaires organisation / unités longs ; selects custom OK mais scroll lourd |
| **Global** | Bottom nav 5 onglets OK ; cibles parfois `< 44px` (`text-[10px]` actions) ; `min-h-9` boutons ui (~36px) sous la cible 44px |
| **PWA Install** | Bouton sidebar / Plus : install native seulement si `beforeinstallprompt` ; masqué iOS |

Desktop baselines : sidebar sombre + contenu clair ; barre mobile absente (≥1024) — OK depuis fix Phase précédente.

---

## 7. Found, not fixed

Bugs / risques **UI ou hygiene** repérés en audit — **non corrigés** (décision Phase suivante).

| # | Sévérité | Fichier (indicatif) | Problème | Correctif proposé |
|---|----------|---------------------|----------|-------------------|
| 1 | Med | `api.ts` (~plusieurs `alert(`) | Erreurs download/upload via `alert()` natif | Toast kit (Phase 3) |
| 2 | Med | 12+ pages / modales | 53 `alert`/`confirm` bloquants mobile | `ConfirmDialog` + `Toast` |
| 3 | Low | `index.css` + `odoo.css` | Classes header/boutons dupliquées | Fusion tokens Phase 2 |
| 4 | Med | Pages géantes | BuildingDetail 2700 L, etc. | Extraire dossiers `features/*` Phase 4 (sans changer la logique) |
| 5 | Low | `Select` + `SearchableSelect` | Deux APIs, ~800 L | Unifier Phase 3 |
| 6 | Low | `ui.tsx` + `OdooKit.tsx` | Deux kits | Kit unique Phase 3 |
| 7 | Med | Paiements mobile | Trop de cartes synthèse avant la liste | Hiérarchie « money hero » Phase 4d |
| 8 | Low | `text-[10px]` / `text-[11px]` ×177 | Lisibilité / AA | Scale typo tokens Phase 2–3 |
| 9 | Low | Boutons `min-h-9` | Sous 44px thumb target | Tokens spacing / Button sizes |
| 10 | Info | `__design-doc/*` + `.cursor/rules` design* | Docs/règles hors thème live | Archiver Phase 2 |
| 11 | Info | Backend (hors UI) | JWT fallback, CORS, raw SQL bootstrap, uploads disque, etc. | **Phase 7** `BACKEND_RISKS.md` uniquement |
| 12 | Low | `InstallAppButton` | iOS : install auto impossible (limite Apple) | Documenter ; masquer déjà si iOS |

*(Les items backend restent hors scope Phase 1–6 code ; listés pour mémoire.)*

---

## 8. Synthèse pour Phase 2+

1. **Une** source de vérité visuelle (tokens + doc) — archiver KIZ / design.json.  
2. **Un** kit composants — fusionner `ui` + `OdooKit` + selects.  
3. Remplacer **alert/confirm**.  
4. Migrer pages gros fichiers en dernier (ordre Phase 4).  
5. Mobile : réduire chrome KPI / toolbars ; money-first ; cibles 44px.

---

## 9. Méthode de comptage

Scripts one-shot locaux (non versionnés) : parcours `src/**/*.ts{,x}`, regex `<button`, `alert(`, `text-\[[0-9.]+px\]`, extraction classes CSS `.name`.  
Heuristique « unused CSS » : occurrence ≤ 1 dans tout `src` (peut sous-estimer l’usage dynamique).  
API : regex sur `api(...)` + helpers nommés dans les pages (certains appels via wrappers `getAuditLogs` / `downloadReport` listés à part).
