import { useRef, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { HelpHint } from '@/components/ui';
import { Button, Callout, Card, Field, Input } from '@/components/ui/index';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { downloadReport, importReportExcel } from '@/lib/api';
import { pluralFr } from '@/lib/format';

export function ExportsPage() {
  useRegisterRootSectionFallback();
  const [year, setYear] = useState(new Date().getFullYear());
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(f: File | null) {
    if (!f) return;
    setImportErr(null);
    setImportOk(null);
    setImporting(true);
    try {
      const r = await importReportExcel(f);
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
      setImportOk(parts.length ? `Import enregistré : ${parts.join(', ')}.` : 'Import terminé (aucune nouvelle ligne).');
      if (r.warnings.length) {
        setImportOk((prev) => `${prev}\nAvertissements : ${r.warnings.slice(0, 8).join(' · ')}`);
      }
      if (r.errors.length) {
        setImportErr(`Certaines lignes n’ont pas été prises en compte :\n${r.errors.slice(0, 15).join('\n')}`);
      }
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Import impossible');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <AppPageTitle
        iconTo="/exports"
        title="Export / import"
        hintTitle="Téléchargez le modèle Excel (même structure que l’export), complétez-le, puis réimportez-le pour alimenter votre espace (biens, baux, paiements, charges)."
        subtitle="Modèle Excel, export des données et réimport en masse."
      />

      <Card className="max-w-lg">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Télécharger un rapport</h2>
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              Année du rapport
              <HelpHint
                className="align-middle"
                title="Excel : feuilles Synthèse, Locataires, Baux, Biens, Paiements, Charges. Même fichier utilisable pour l’import après édition."
              />
            </span>
          }
          htmlFor="export-year"
        >
          <Input
            id="export-year"
            type="number"
            className="w-32"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </Field>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => downloadReport('pdf', year)}>Télécharger PDF</Button>
          <Button variant="secondary" onClick={() => downloadReport('xlsx', year)}>
            Télécharger Excel
          </Button>
        </div>
      </Card>

      <Card className="max-w-lg">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Importer un classeur</h2>
        <p className="mb-4 text-sm leading-relaxed text-[var(--color-muted)]">
          Utilisez le fichier Excel exporté depuis ImmoPilot (ou le même modèle de feuilles). Renseignez les onglets{' '}
          <strong className="font-semibold text-[var(--color-ink)]">Biens</strong>,{' '}
          <strong className="font-semibold text-[var(--color-ink)]">Baux</strong>,{' '}
          <strong className="font-semibold text-[var(--color-ink)]">Paiements</strong>,{' '}
          <strong className="font-semibold text-[var(--color-ink)]">Charges</strong>, etc., puis envoyez le fichier : les
          données sont fusionnées dans votre projet (création ou mise à jour selon les lignes).
        </p>
        <div className="flex flex-wrap items-center gap-3">
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
          <Callout variant="success" className="mt-4 whitespace-pre-wrap">
            {importOk}
          </Callout>
        ) : null}
        {importErr ? (
          <Callout variant="danger" className="mt-4 whitespace-pre-wrap">
            {importErr}
          </Callout>
        ) : null}
      </Card>
    </div>
  );
}
