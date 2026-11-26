import { useRef, useState } from 'react';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { Button, Callout, Field, Input } from '@/components/ui/index';
import { toast } from '@/components/ui/Toast';
import {
  api,
  ApiError,
  downloadImportExample,
  downloadImportTemplate,
  importReportExcel,
} from '@/lib/api';
import { pluralFr } from '@/lib/format';

type ResetOptions = {
  payments: boolean;
  leases: boolean;
  tenants: boolean;
  buildings: boolean;
  charges: boolean;
  repairs: boolean;
  inspections: boolean;
  collectors: boolean;
};

const RESET_LABELS: Array<{ key: keyof ResetOptions; label: string; hint?: string }> = [
  { key: 'payments', label: 'Échéances et relances', hint: 'Inclus automatiquement si vous supprimez les baux ou les biens.' },
  { key: 'leases', label: 'Baux', hint: 'Révisions de loyer, historique des baux.' },
  { key: 'tenants', label: 'Locataires', hint: 'Conservez-les en ne cochant pas cette case (sans baux actifs).' },
  { key: 'buildings', label: 'Biens et unités', hint: 'Supprime aussi baux, échéances et charges liées.' },
  { key: 'charges', label: 'Charges / dépenses', hint: 'Inclus si vous supprimez les biens.' },
  { key: 'inspections', label: 'États des lieux' },
  { key: 'repairs', label: 'Réparations' },
  { key: 'collectors', label: 'Collecteurs terrain et tâches de collecte' },
];

const defaultReset: ResetOptions = {
  payments: false,
  leases: false,
  tenants: false,
  buildings: false,
  charges: false,
  repairs: false,
  inspections: false,
  collectors: false,
};

/** Données d’exemple + réinitialisation sélective (OWNER). */
export function ProfileDataTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importOk, setImportOk] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [reset, setReset] = useState<ResetOptions>(defaultReset);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [resetting, setResetting] = useState(false);

  async function onPickFile(file: File | null) {
    if (!file) return;
    setImportErr(null);
    setImportOk(null);
    setImporting(true);
    try {
      const r = await importReportExcel(file);
      const parts = [
        r.buildingsCreated ? pluralFr(r.buildingsCreated, 'bien', 'biens') : null,
        r.unitsCreated ? pluralFr(r.unitsCreated, 'unité', 'unités') : null,
        r.tenantsCreated ? pluralFr(r.tenantsCreated, 'locataire', 'locataires') : null,
        r.leasesCreated
          ? `${pluralFr(r.leasesCreated, 'bail', 'baux')} créé${r.leasesCreated > 1 ? 's' : ''}`
          : null,
        r.leasesUpdated ? `${pluralFr(r.leasesUpdated, 'bail', 'baux')} mis à jour` : null,
        r.paymentsUpserted ? pluralFr(r.paymentsUpserted, 'échéance', 'échéances') : null,
        r.chargesCreated ? pluralFr(r.chargesCreated, 'charge', 'charges') : null,
      ].filter(Boolean);
      setImportOk(parts.length ? parts.join(' · ') : 'Import terminé (aucune ligne nouvelle).');
      if (r.warnings?.length) {
        toast(`${r.warnings.length} avertissement(s) — voir détail si besoin dans Exports.`, { variant: 'warning' });
      }
      if (r.errors?.length) {
        setImportErr(r.errors.slice(0, 8).join('\n') + (r.errors.length > 8 ? '\n…' : ''));
      }
    } catch (e) {
      setImportErr(e instanceof ApiError ? e.message : 'Import impossible');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function loadRichDemo() {
    const ok = await confirmDialog({
      title: 'Charger le jeu d’exemple ?',
      message:
        'Nous ajoutons des biens, baux et loyers fictifs de janvier au mois en cours.\nVos données existantes ne sont pas effacées.',
      confirmLabel: 'Charger',
    });
    if (!ok) return;
    setLoadingDemo(true);
    try {
      const r = await api<{ message: string }>('/me/onboarding/seed-rich-demo', { method: 'POST' });
      toast(r.message, { variant: 'success' });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Chargement impossible', { variant: 'error' });
    } finally {
      setLoadingDemo(false);
    }
  }

  function toggle(key: keyof ResetOptions) {
    setReset((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'buildings' && next.buildings) {
        next.leases = true;
        next.payments = true;
        next.charges = true;
      }
      if (key === 'leases' && next.leases) next.payments = true;
      return next;
    });
  }

  async function runReset() {
    const any = Object.values(reset).some(Boolean);
    if (!any) {
      toast('Cochez au moins une catégorie à supprimer.', { variant: 'error' });
      return;
    }
    if (confirmPhrase.trim() !== 'EFFACER') {
      toast('Tapez EFFACER pour confirmer.', { variant: 'error' });
      return;
    }
    const ok = await confirmDialog({
      title: 'Suppression définitive',
      message: 'Cette action est irréversible sur les catégories cochées. Continuer ?',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;

    setResetting(true);
    try {
      const r = await api<{ message: string; counts?: Record<string, number> }>('/me/onboarding/reset-data', {
        method: 'POST',
        json: { ...reset, confirmPhrase: 'EFFACER' },
      });
      const detail = r.counts
        ? Object.entries(r.counts)
            .filter(([, n]) => n > 0)
            .map(([k, n]) => `${k}: ${n}`)
            .join(' · ')
        : '';
      toast(detail ? `${r.message} ${detail}` : r.message, { variant: 'success' });
      setReset(defaultReset);
      setConfirmPhrase('');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Suppression impossible', { variant: 'error' });
    } finally {
      setResetting(false);
    }
  }

  function presetFullRestart() {
    setReset({
      payments: true,
      leases: true,
      tenants: true,
      buildings: true,
      charges: true,
      repairs: true,
      inspections: true,
      collectors: true,
    });
  }

  function presetKeepTenants() {
    setReset({
      payments: true,
      leases: true,
      tenants: false,
      buildings: true,
      charges: true,
      repairs: true,
      inspections: true,
      collectors: true,
    });
  }

  return (
    <div className="space-y-8">
      <Callout variant="info" title="Trois façons de remplir le compte">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>
            <strong className="font-semibold">Fichier Excel</strong> — téléchargez l’exemple prérempli ou le modèle
            vide, puis importez-le ci-dessous (même format que l’export ImmoPilot).
          </li>
          <li>
            <strong className="font-semibold">Jeu d’exemple en un clic</strong> — injection directe en base (sans
            fichier).
          </li>
          <li>
            <strong className="font-semibold">Votre classeur</strong> — reprenez un export Excel déjà édité depuis
            Exports.
          </li>
        </ol>
      </Callout>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-[var(--color-ink)]">Import Excel (.xlsx)</h3>
        <p className="text-sm text-[var(--color-muted)]">
          L’exemple est généré à la demande (fichier{' '}
          <strong className="font-medium text-[var(--color-ink)]">immopilot-exemple-import.xlsx</strong>) : environ{' '}
          <strong className="font-medium text-[var(--color-ink)]">28 biens</strong> (immeubles, villas, lots/terrains),{' '}
          <strong className="font-medium text-[var(--color-ink)]">28 locataires</strong>, loyers de janvier au mois en
          cours. Téléchargez-le, puis importez-le avec le sélecteur de fichier juste en dessous.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => downloadImportExample()}>
            Télécharger l’exemple (28 biens · année en cours)
          </Button>
          <Button type="button" variant="ghost" onClick={() => downloadImportTemplate()}>
            Modèle vide
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="max-w-full text-sm text-[var(--color-muted)] file:mr-3 file:rounded-[var(--radius-control)] file:border file:border-[var(--odoo-border)] file:bg-[var(--color-surface)] file:px-3 file:py-1.5 file:text-sm file:font-medium"
            disabled={importing}
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          {importing ? <span className="text-sm text-[var(--color-muted)]">Traitement…</span> : null}
        </div>
        {importOk ? (
          <Callout variant="success" className="whitespace-pre-wrap">
            {importOk}
          </Callout>
        ) : null}
        {importErr ? (
          <Callout variant="danger" className="whitespace-pre-wrap">
            {importErr}
          </Callout>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-[var(--odoo-border)] pt-6">
        <h3 className="text-base font-semibold text-[var(--color-ink)]">Jeu d’exemple (sans fichier)</h3>
        <Button type="button" disabled={loadingDemo} onClick={() => void loadRichDemo()}>
          {loadingDemo ? 'Chargement…' : 'Charger en un clic (~28 biens, même jeu que l’Excel)'}
        </Button>
        <p className="text-xs text-[var(--color-muted)]">
          Préfixe « Démo année complète (fictif) » dans les notes. N’efface pas vos données existantes.
        </p>
      </section>

      <section className="space-y-4 border-t border-[var(--odoo-border)] pt-6">
        <h3 className="text-base font-semibold text-[var(--color-ink)]">Repartir à zéro (sélectif)</h3>
        <p className="text-sm text-[var(--color-muted)]">
          Choisissez ce qui est supprimé — par exemple garder les locataires en ne cochant pas « Locataires ».
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="text-xs" onClick={presetFullRestart}>
            Tout cocher
          </Button>
          <Button type="button" variant="secondary" className="text-xs" onClick={presetKeepTenants}>
            Tout sauf locataires
          </Button>
          <Button type="button" variant="ghost" className="text-xs" onClick={() => setReset(defaultReset)}>
            Décocher tout
          </Button>
        </div>
        <ul className="space-y-3">
          {RESET_LABELS.map(({ key, label, hint }) => (
            <li key={key}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={reset[key]}
                  onChange={() => toggle(key)}
                />
                <span>
                  <span className="font-medium text-[var(--color-ink)]">{label}</span>
                  {hint ? (
                    <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{hint}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Field label="Confirmation" htmlFor="reset-confirm">
          <Input
            id="reset-confirm"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder="Tapez EFFACER"
            autoComplete="off"
          />
        </Field>
        <Button type="button" variant="danger" disabled={resetting} onClick={() => void runReset()}>
          {resetting ? 'Suppression…' : 'Supprimer les données cochées'}
        </Button>
      </section>
    </div>
  );
}