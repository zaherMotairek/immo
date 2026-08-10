import { useRef, useState } from 'react';
import { downloadReport, importReportExcel } from '@/lib/api';
import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { Button, Card, HelpHint, Input, Label } from '@/components/ui';

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
        r.buildingsCreated ? `${r.buildingsCreated} bien(s)` : null,
        r.unitsCreated ? `${r.unitsCreated} unité(s)` : null,
        r.tenantsCreated ? `${r.tenantsCreated} locataire(s)` : null,
        r.leasesCreated ? `${r.leasesCreated} bail(aux) créé(s)` : null,
        r.leasesUpdated ? `${r.leasesUpdated} bail(aux) mis à jour` : null,
        r.paymentsUpserted ? `${r.paymentsUpserted} échéance(s)` : null,
        r.chargesCreated ? `${r.chargesCreated} charge(s)` : null,
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
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Télécharger un rapport</h2>
        <div className="mb-4">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Label htmlFor="export-year" className="mb-0">
              Année du rapport
            </Label>
            <HelpHint
              className="align-middle"
              title="Excel : feuilles Synthèse, Locataires, Baux, Biens, Paiements, Charges. Même fichier utilisable pour l’import après édition."
            />
          </div>
          <Input
            id="export-year"
            type="number"
            className="mt-1 w-32"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => downloadReport('pdf', year)}>Télécharger PDF</Button>
          <Button variant="secondary" onClick={() => downloadReport('xlsx', year)}>
            Télécharger Excel
          </Button>
        </div>
      </Card>

      <Card className="max-w-lg">
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Importer un classeur</h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Utilisez le fichier Excel exporté depuis ImmoPilot (ou le même modèle de feuilles). Renseignez les onglets{' '}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Biens</strong>,{' '}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Baux</strong>,{' '}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Paiements</strong>,{' '}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Charges</strong>, etc., puis envoyez le
          fichier : les données sont fusionnées dans votre projet (création ou mise à jour selon les lignes).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="max-w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-slate-300 dark:file:border-slate-600 dark:file:bg-slate-800"
            disabled={importing}
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          {importing ? <span className="text-sm text-slate-500">Traitement…</span> : null}
        </div>
        {importOk ? (
          <p className="mt-4 whitespace-pre-wrap text-sm font-medium text-emerald-700 dark:text-emerald-400" role="status">
            {importOk}
          </p>
        ) : null}
        {importErr ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-red-600 dark:text-red-400" role="alert">
            {importErr}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
