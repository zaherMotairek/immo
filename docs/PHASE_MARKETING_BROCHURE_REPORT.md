# Prompt 2 — `docs/marketing-brochure` (STOP — phase initiale)

Branche : `docs/marketing-brochure` (base `fix/design-polish`).  
Périmètre : **aucun code applicatif** — scripts + `docs/marketing/` uniquement.

## Livré dans cette session

| Élément | Statut | Chemin |
|--------|--------|--------|
| Garde-fou DB locale | OK | `scripts/assert-local-db.mjs` |
| Seed démo marketing | Script prêt | `scripts/seed-marketing-demo.mjs` |
| Captures Playwright | Script prêt | `scripts/capture-marketing-shots.mjs` |
| Textes FR centralisés | Squelette | `docs/marketing/content.fr.json` |
| Contact / tarifs | Placeholders | `docs/marketing/contact.json`, `pricing.json` |
| Brochure HTML + CSS | 2 pages (ébauche) | `docs/marketing/brochure/` |
| Export PDF | Script prêt | `scripts/render-marketing-brochure.mjs` |
| Légendes pub | OK | `docs/marketing/captions.md` |
| Install / PR GitHub | Scripts | `scripts/install-github-cli.ps1`, `create-pr-fix-design-polish.ps1` |

## Non livré (prochaine itération Prompt 2)

- Brochure PDF **14–20 pages** complète, repères sur captures, légendes numérotées.
- Flyer A4 + 3 visuels sociaux dans `docs/marketing/ads/`.
- Exécution de `seed-marketing-demo.mjs` + `capture-marketing-shots.mjs` → dossier `docs/marketing/shots/`.
- Tableau revendications / QA visuelle page par page.
- Plans tarifaires réels (application sans module billing sur `main` → montants `null`).

## Commandes

```text
node scripts/assert-local-db.mjs
node scripts/seed-marketing-demo.mjs
# API :4000 + front preview :4173
cd frontend && node ../scripts/capture-marketing-shots.mjs
node scripts/render-marketing-brochure.mjs
```

## Placeholders à compléter par vous

- `docs/marketing/contact.json` (WhatsApp, téléphone, e-mail, site, QR).
- `docs/marketing/pricing.json` (`monthlyAmountFcfa` pour Essai / Gratuit / Pro).

## PR Prompt 1 + gh

- Branche `fix/design-polish` déjà sur GitHub.
- **gh** : téléchargement depuis `github.com` **échoue** sur cette machine (timeout réseau). Utiliser :
  1. `powershell -File scripts/install-github-cli.ps1` quand Internet répond ;
  2. `gh auth login` ;
  3. `powershell -File scripts/create-pr-fix-design-polish.ps1`
- Lien manuel : https://github.com/zaherMotairek/immo/pull/new/fix/design-polish

## Captures Prompt 1 (e2e)

- `npm --prefix frontend run e2e:screenshots` — **OK** (1 test, ~2,4 min) ; baselines sous `frontend/e2e/baselines/`.

**Pas de push / merge sans votre GO.**