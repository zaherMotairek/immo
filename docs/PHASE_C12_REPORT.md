# Phase C1–C2 — STOP report

Branche : `feat/pro-hardening`  
Date : 2026-10-30

## 1. What I did

- **C1** Opt-in `autoGenerateSchedules` : baux sans fin → horizon 12 mois ; `ensureScheduleMonthsAhead` idempotent ; job annuel 1er jan. 05:30 Abidjan + advisory lock.
- **C2** Opt-in `autoRemindersEnabled` : règles J-3/J0/J+5/J+15, quiet hours, templates FR, file `reminder_outbox`, WhatsAppProvider (wa.me + stub Cloud API), écran `/relances` (envoyer / ignorer), onglet Profil → Automation.
- Tests unitaires templates / quiet hours ; migration SQL idempotente.

## 2. Files (principaux)

- `prisma/schema.prisma`, `migrations/20261030190000_phase_c_automation/`
- `automation/*`, `reminders/*`, `whatsapp/*`, `jobs/schedule-extend.job.ts`
- `leases.service.ts` (horizon + create/update)
- `frontend/.../RemindersPage.tsx`, `ProfileAutomationTab.tsx`, `Layout.tsx`, `App.tsx`

## 3. Commands

```
node scripts/assert-local-db.mjs
cd backend && npx prisma generate
# si migrate history OK : npx prisma migrate deploy
# sinon (dev local) : prisma db execute --file prisma/migrations/20261030190000_phase_c_automation/migration.sql
cd backend && npm test -- --testPathPattern=org-automation && npx tsc -p tsconfig.json --noEmit
cd frontend && npx tsc -b
```

## 4. Screenshots

`frontend/e2e/phase-c12/` (light) :

- `profil-automation-mobile.png` (390)
- `profil-automation-desktop.png`
- `relances-mobile.png` (390)
- `relances-desktop.png`

## 5. Migrations + rollback

- Ajout : `automation_settings` JSONB sur `organizations` ; table `reminder_outbox` + enum `ReminderOutboxStatus`.
- Rollback : `DROP TABLE reminder_outbox` ; `ALTER TABLE organizations DROP COLUMN automation_settings` (après backup). Ne pas DROP en prod sans PITR.

**Note locale :** `prisma migrate deploy` peut échouer si une ancienne migration (`20260423143000_organization_platform_access`) est marquée failed sur la DB de dev — SQL C appliqué via `db execute` sur sync_kiz.

## 6. Found, not fixed

- C3–C8 non faits (STOP demandé après C1–C2).
- WhatsApp Cloud API = stub (pas d’envoi HTTP réel).
- Relances WhatsApp « SENT » = lien wa.me généré (file manuelle), pas confirmation de lecture.
- Job enqueue/process horaire : quiet hours laisse QUEUED (pas d’erreur).
- Historique `PaymentReminder` inchangé structurellement (ligne créée à l’envoi).

## 7. Need from you

- **GO** pour C3–C4 ?
- Captures d’écran OK sans rejeu, ou tu veux que je les prenne au prochain GO ?
- Push branche ?
