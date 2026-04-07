import { useState } from 'react';
import { downloadReport } from '@/lib/api';
import { Button, Card, Input, Label } from '@/components/ui';

export function ExportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exports</h1>
        <p className="text-sm text-slate-600">
          Téléchargez un rapport PDF ou un tableau Excel (loyers, charges, alertes).
        </p>
      </div>

      <Card className="max-w-md">
        <div className="mb-4">
          <Label>Année du rapport</Label>
          <Input type="number" className="mt-1 w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => downloadReport('pdf', year)}>Télécharger PDF</Button>
          <Button variant="secondary" onClick={() => downloadReport('xlsx', year)}>
            Télécharger Excel
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Excel : feuilles Synthèse (chiffres clés), Locataires, Baux, Biens & occupation, Paiements de l’année,
          Charges détaillées — filtres automatiques, montants en FCFA, libellés en français.
        </p>
      </Card>
    </div>
  );
}
