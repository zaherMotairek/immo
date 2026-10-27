# ImmoPilot — Design system « Calm ledger »

Source de vérité visuelle. Tokens : `frontend/src/theme/tokens.css`.  
Anciennes specs contradictoires (palette KIZ, etc.) : `docs/archive/`.

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

## Options Phase 2 (choix produit)

Preview : `html[data-ds-option="a"|"b"]`, `localStorage immopilot-ds-option`, ou `?ds=a|b`.  
Page galerie (DEV) : `/design` — absente du menu.

| Option | Accent | Sidebar |
|--------|--------|---------|
| **A** | Teal `#0F766E` | Sombre (pierre / noir chaud) |
| **B** | Emerald `#047857` | Claire (neutres chauds) |

Tant qu’aucune option n’est figée, l’app reste sur le thème monochrome Odoo actuel (comportement préservé).

## Règles UI

- Cibles tactiles ≥ 44 px (mobile).
- Focus visible ; contraste AA ; labels sur tous les champs.
- Toasts / ConfirmDialog (Phase 3) à la place de `alert` / `confirm`.
- Un seul kit composants (Phase 3) ; migration pages Phase 4.

## Cursor

Règle courte : `frontend/.cursor/rules/ui.mdc` → pointe ici.
