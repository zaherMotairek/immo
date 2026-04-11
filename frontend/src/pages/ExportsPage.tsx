import { useState } from 'react';
import { downloadReport } from '@/lib/api';
import { AppPageTitle } from '@/components/AppPageTitle';
import { ReturnNavigation } from '@/components/ReturnNavigation';
import { Button, Card, HelpHint, Input, Label } from '@/components/ui';

export function ExportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <div className="space-y-6">
      <ReturnNavigation fallbackHref="/" fallbackLabel="Tableau de bord" />
      <AppPageTitle
        className="max-w-3xl"
        iconTo="/exports"
        title="Exports"
        hintTitle="Téléchargez un rapport PDF ou un tableau Excel pour l’année choisie (loyers, charges, synthèse)."
      />

      <Card className="max-w-md">
        <div className="mb-4">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Label htmlFor="export-year" className="mb-0">
              Année du rapport
            </Label>
            <HelpHint
              className="align-middle"
              title="Excel : feuilles Synthèse, Locataires, Baux, Biens & occupation, Paiements de l’année, Charges détaillées. Montants en FCFA, libellés en français."
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
    </div>
  );
}
