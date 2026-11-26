# Prompt 4 — `docs/marketing-update` (STOP)

**Branche :** `docs/marketing-update` (depuis `origin/main` · `aae1537`)  
**Captures :** application **phase C+D** via worktree `feat/pro-hardening` (`2fd1712` + preview local) — **aucun code app dans cette branche marketing**.

## 1. Ce qui a été fait

- Textes mis à jour : **Aujourd’hui**, relances auto, encaissement groupé, formules, import Excel validé.
- **Nouvelle section brochure** « Relances automatiques » + capture `/relances`.
- **Pricing** aligné sur le catalogue plans (FREE / TRIAL / PRO : **25 000 F CFA** pour Pro).
- Seed marketing : org **PRO démo**, automation activée, entrée **reminder_outbox** SENT.
- **36 captures** régénérées (mobile 390 + desktop 1440), dont `relances.png`.
- PDF flyer + 3 visuels sociaux régénérés.

## 2. Fichiers modifiés (marketing uniquement)

| Fichier | Changement |
|---------|------------|
| `docs/marketing/content.fr.json` | C+D, FAQ, Bientôt, écran relances |
| `docs/marketing/pricing.json` | Prix réels plans |
| `docs/marketing/captions.md` | Message relances auto + Pro |
| `docs/marketing/shots/**` | Recapture complète + relances |
| `docs/marketing/brochure/brochure.html` | Regénéré |
| `docs/marketing/ImmoPilot-brochure.pdf` | ~**26** sections · **6,3 Mo** (< 15 Mo) |
| `docs/marketing/ads/*` | Flyer + sociaux |
| `scripts/capture-marketing-shots.mjs` | Route `/relances` |
| `scripts/seed-marketing-demo.mjs` | Automation + outbox démo |

## 3. Commandes

```text
node scripts/assert-local-db.mjs && node scripts/seed-marketing-demo.mjs
# API :4000 + preview :4173 (build feat/pro-hardening)
node scripts/capture-marketing-shots.mjs
node scripts/build-marketing-brochure.mjs
node scripts/render-marketing-all.mjs
```

Résultat : captures OK, PDF **6,29 Mo**.

## 4. Brochure — écrans → pages (ordre HTML, ~1 section = 1 page)

| # | Section |
|---|---------|
| 1 | Couverture |
| 2 | Quotidien propriétaire |
| 3 | Solution |
| 4 | Bénéfices |
| 5 | 5 étapes |
| 6–18 | Écrans (dashboard → **relances** → … → journal sécurité) |
| 19 | Mobile PWA |
| 20 | Sécurité |
| 21 | **Nos formules** (25 000 / 0 / limites FREE-TRIAL) |
| 22 | FAQ |
| 23 | Bientôt |
| 24 | CTA contact |
| 25 | Quatrième de couverture |

## 5. Revendications C+D (extrait)

| Affirmation | Preuve |
|-------------|--------|
| Écran **Aujourd’hui** | `DashboardPage` + captures `dashboard.png` |
| **Relances auto** e-mail | `RemindersPage`, `reminder_outbox`, seed SENT |
| Encaissement **groupé** | `PaymentsBulkCollectModal`, `/payments/bulk-collect` |
| Formules **Essai / Gratuit / Pro** | table `plans`, `pricing.json` |
| Import Excel **rapport** | `ExportsPage`, `importReportExcel` |
| Face ID | `WebAuthn` / profil (texte sécurité) |
| États des lieux / réparations | **Non capturés** (phase G hors merge public) — listés « Bientôt » partiel |

## 6. Captures non réalisées / limites

- Quittance PDF toujours non capturée (génération à la volée).
- Onglet **Automation** (profil) : pas de capture dédiée (mention dans texte relances).
- Admin plateforme : exclu (comme prompt 2).

## 7. À compléter par vous

- `docs/marketing/contact.json` (WhatsApp, téléphone, e-mail, site).
- Valider visuellement le PDF et les visuels sociaux.
- **GO push / PR** vers `main` si OK (non poussé sans accord).

## 8. Notes techniques

- Captures exécutées contre **feat/pro-hardening** en local (C+D présentes).
- Correctif **temporaire** `orgAccessStatus` uniquement dans la worktree de capture (build front) — **non** inclus dans `docs/marketing-update`.
- Stash git `phase-g-wip` sur `feat/pro-hardening` toujours présent (phase G non commitée).