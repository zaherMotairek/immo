import { useRef, useState } from 'react';
import { AppPageTitle } from '@/components/AppPageTitle';
import { HelpHint } from '@/components/ui';
import { Button, Callout, Card, Field, Input } from '@/components/ui/index';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { downloadImportTemplate, downloadReport, importReportExcel } from '@/lib/api';
import { pluralFr } from '@/lib/format';

export function ExportsPage() {
  useRegisterRootSectionFallback();
  const [year, setYear] = useState(new Date().getFullYear());
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<{
    errors: string[];
    warnings: string[];
    summary: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(f: File | null) {
    if (!f) return;
    setImportErr(null);
    setImportOk(null);
    setValidationReport(null);
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
      const summary = parts.length
        ? `Import enregistré : ${parts.join(', ')}.`
        : 'Import terminé (aucune nouvelle ligne).';
      setImportOk(summary);
      setValidationReport({
        summary,
        errors: r.errors,
        warnings: r.warnings,
      });
      if (r.errors.length) {
        setImportErr(`${r.errors.length} ligne(s) rejetée(s) — détail dans le rapport ci-dessous.`);
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
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Modèle d’import</h2>
        <p className="mb-4 text-sm leading-relaxed text-[var(--color-muted)]">
          Classeurs vides avec les bons onglets et en-têtes. Remplissez, puis importez ci-dessous — un rapport
          d’erreurs / avertissements s’affiche après traitement.
        </p>
        <Button type="button" variant="secondary" onClick={() => downloadImportTemplate()}>
          Télécharger le modèle Excel
        </Button>
      </Card>

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
          Utilisez le <strong className="font-semibold text-[var(--color-ink)]">modèle</strong> ou un export ImmoPilot.
          Renseignez les onglets{' '}
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
        {validationReport && (validationReport.errors.length > 0 || validationReport.warnings.length > 0) ? (
          <div className="mt-4 space-y-3 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-3 text-sm">
            <p className="font-semibold text-[var(--color-ink)]">Rapport de validation</p>
            {validationReport.errors.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--status-danger)]">
                  Erreurs ({validationReport.errors.length})
                </p>
                <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-[var(--color-ink)]">
                  {validationReport.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {validationReport.warnings.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  Avertissements ({validationReport.warnings.length})
                </p>
                <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-[var(--color-muted)]">
                  {validationReport.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
