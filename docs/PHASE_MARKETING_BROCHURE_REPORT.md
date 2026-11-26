# Prompt 2 — `docs/marketing-brochure` (STOP)

Branche : `docs/marketing-brochure` · **PR brouillon** : https://github.com/zaherMotairek/immo/pull/2  
Aucun code applicatif modifié.

## Livrables

| Fichier | Description |
|---------|-------------|
| `docs/marketing/ImmoPilot-brochure.pdf` | Brochure ~**25 pages** A4 |
| `docs/marketing/ImmoPilot-brochure-demo.pdf` | Ancienne ébauche (conservée) |
| `docs/marketing/ads/ImmoPilot-flyer.pdf` + `.png` | Flyer A4 |
| `docs/marketing/ads/social-*-1080.png` | 2 visuels feed 1080×1080 |
| `docs/marketing/ads/social-story-1080x1920.png` | Story WhatsApp |
| `docs/marketing/shots/` | 34 captures mobile/desktop |
| `docs/marketing/captions.md` | 6 messages court |
| `docs/marketing/content.fr.json` | Textes centralisés FR |
| `docs/marketing/contact.json`, `pricing.json` | Placeholders |

## Scripts

```text
node scripts/seed-marketing-demo.mjs      # DB locale uniquement
node scripts/capture-marketing-shots.mjs  # API :4000 + preview :4173
node scripts/build-marketing-brochure.mjs
node scripts/render-marketing-all.mjs
```

## Plan brochure → sections (ordre HTML)

1. Couverture · 2. Quotidien propriétaire · 3. Solution · 4. Bénéfices · 5. 5 étapes  
6–17. Écrans (dashboard → journal sécurité) · 18. Mobile PWA · 19. Sécurité · 20. Formules  
21. FAQ · 22. Bientôt · 23. Contact · 24. Quatrième de couverture  

## Captures absentes / limites

- **Quittance PDF** : non capturée (génération navigateur/PDF à la volée — à ajouter manuellement).
- **Dialogue toast / validation** : non scriptés dans cette passe.
- **Page admin clients** : volontairement exclue (interne).

## Placeholders à compléter

- `contact.json` : WhatsApp, téléphone, e-mail, site, QR.
- `pricing.json` : montants Essai / Pro (module billing absent de l'app sur cette branche).

## Tableau des revendications (extrait)

| Affirmation brochure | Preuve dans l'app |
|----------------------|-------------------|
| Biens / unités / immeuble / terrain | `BuildingsPage`, `BuildingStructureKind` |
| Locataires + pièce d'identité | `TenantsPage`, `TenantIdDocumentSection` |
| Baux + génération échéances | `LeasesPage`, API `generate-payments` |
| Paiements + modes encaissement | `PaymentsPage`, `CollectionMethod` |
| Loyer offert / partiel | PATCH paiement, `WAIVED`, partiel |
| Reçu PDF | `PdfPrintButton`, `immo-pdf.ts` |
| Relances e-mail / WhatsApp log | `PaymentReminder`, `RemindersPage` |
| Cautions & charges | `CautionsChargesPage`, modèle `Charge` |
| Comptabilité / clôture | `ComptabilitePage`, `accounting_period_closures` |
| Calendrier loyers | `YearlyRentActivityPage` |
| Carte des biens | `LocationsPage` |
| Import / export Excel | `ExportsPage`, API reports |
| Collecteurs | `CollectorsPage`, tables SQL `rent_collectors` |
| Journal sécurité | `AuditLogPage` |
| PWA / thème sombre | `vite-plugin-pwa`, `ThemeToggle` |
| Connexion biométrique | `WebAuthn` (si activé) |
| **Non** : paiement en ligne locataire | — |
| **Non** : relances 100 % automatiques | relances manuelles / journal |
| **Non** : relevé agence / propriétaire | reporté « Bientôt » |

## Qualité

- Données **fictives** uniquement (seed Abidjan).
- Aucune capture de page login sur les écrans connectés (script `assertNotLogin`).
- Français « vous », F CFA dans les textes.

## Notes PR Prompt 1

- PR #1 : https://github.com/zaherMotairek/immo/pull/1 (`fix/design-polish`)

**Pas de merge sans votre OK.**