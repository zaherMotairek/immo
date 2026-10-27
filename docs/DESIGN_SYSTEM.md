# ImmoPilot — Design system « Calm ledger »

Source de vérité visuelle. Tokens : `frontend/src/theme/tokens.css`.  
Anciennes specs contradictoires (palette KIZ, etc.) : `docs/archive/`.

## Statut migration

| Phase | Contenu | État |
|-------|---------|------|
| 0–2 | Baselines e2e, tokens, page `/design`, options A/B | Fait |
| 3 | Kit `components/ui/` + toast / confirm | Fait |
| 4 | Migration pages (auth → admin) vers le kit | **Fait** |
| 5 | Mobile, perf (lazy routes), a11y, PWA brand | Fait |
| 6 | Guardrails `check:ui` + `check:visual` | Fait |
| 7 | Inventaire risques backend | Voir `docs/BACKEND_RISKS.md` |

## Personnalité

Professionnel, chaleureux, rassurant, rapide — fintech / banque de confiance, pas ERP 2015.  
**Light-first** (soleil outdoor sur téléphone) ; dark cohérent.  
**L’argent est le héros** : montants grands, alignés à droite, chiffres tabulaires, hiérarchie dû / payé / reste.

## Tokens

| Famille | Contenu |
|---------|---------|
| Couleurs | Brand (échelle), neutres chauds, surfaces, bordures, texte ink/muted |
| Statuts | Payé vert, En retard rouge, En attente ambre, Abandonné violet, Annulé gris — **toujours** icône + texte + couleur |
| Spacing | Grille 8 pt (`--space-*`) |
| Rayons | Contrôles 8 px, cartes / sheets 10–12 px (sous option Calm ledger) |
| Ombres | `--shadow-soft`, `--shadow-lift` |
| Typo | Roboto + system ; base 16 px inputs mobile ; minimum 12 px ; tabular nums pour l’argent |
| Z-index | sticky 30 → toast 60 |
| Motion | 150–200 ms ; `prefers-reduced-motion` → quasi 0 |

## Décision produit

**Option B figée** — Emerald `#047857`, sidebar claire, neutres chauds.  
Option A (teal + sidebar sombre) : archive DEV via `?ds=a` / `data-ds-option="a"`.  
Page galerie DEV : `/design` (hors menu, lazy).

## Règles UI

- Cibles tactiles ≥ 44 px (mobile).
- Focus visible ; contraste AA ; labels sur tous les champs.
- `toast` / `confirmDialog` à la place de `alert` / `confirm`.
- Un seul kit : `frontend/src/components/ui/` — **ne pas** réintroduire un second kit.
- Pont temporaire : `@/components/ui` → `components/ui.tsx` (ré-exports legacy).
- Routes app : **lazy** (`React.lazy` + `Suspense`) dans `App.tsx` — écrans hors auth chargés à la demande.
- Guardrails CI : `npm run check:ui` (script `frontend/scripts/ui-guardrails.mjs`) — FAIL sur `alert`/`confirm`/hex hors allowlist ; WARN sur `<button>`/`<input>` bruts restants.
- Visuel : `npm run check:visual` (smoke) ; diff pixel opt-in `npm run check:visual:compare`.

## Kit composants

Point d’entrée privilégié : `import { Button, Modal, toast, confirmDialog } from '@/components/ui/index'`.

- Formulaires : `Field`, `Input`, `MoneyInput`, `DateInput`, `Textarea`, `Select`, `Checkbox`, `Switch`, `SegmentedControl`
- Actions : `Button`, `IconButton`, `Toolbar`, `StickyActionBar`
- Données : `Card`, `StatTile`, `StatusBadge` (+ `CollectionMethodBadge`), `DataTable`, `CardList` / `ListRow`
- Structure : `PageHeader`, `Tabs`, `Stepper`
- Feedback : `Modal`, `BottomSheet`, `ConfirmDialog` / `confirmDialog()`, `toast()`, `Callout`, `EmptyState`, `Skeleton`
- Providers (montés dans `main.tsx`) : `ToastProvider`, `ConfirmProvider`

Compatibilité : `@/components/ui` (fichier `ui.tsx`) reste un pont (`Button`, `Input`, `AmountFcfaInput` = `MoneyInput`, `Card`, `StatTile`, `Label`, `HelpHint`, `Select` legacy). Préférer le kit `ui/index` pour le nouveau code. `OdooKit.tsx` : résidus historiques — ne plus étendre.

## Cursor

Règle courte : `frontend/.cursor/rules/ui.mdc` → pointe ici.
