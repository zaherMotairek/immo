import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { Button, Card } from '@/components/ui';

type OverviewRow = {
  leaseId: string;
  active: boolean;
  localizationLine: string;
  buildingName: string;
  unitLabel: string;
  unitKind: string;
  tenantFullName: string;
  monthlyRent: number;
  rentDueDay: number;
  currentMonthStatusFr: string;
};

function statusClass(fr: string) {
  if (fr === 'Payé') return 'bg-emerald-100 text-emerald-900';
  if (fr === 'En retard') return 'bg-amber-100 text-amber-900';
  if (fr === 'Annulé') return 'bg-slate-100 text-slate-600';
  return 'bg-red-50 text-red-800';
}

export function LocationsPage() {
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const q = showAll ? '?all=1' : '';
    api<OverviewRow[]>(`/leases/overview${q}`).then(setRows).catch(() => setRows([]));
  }, [showAll]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Locations</h1>
          <p className="text-sm text-slate-600">
            Vue claire : où est le bien, quel type, qui occupe, combien de loyer (FCFA), statut du mois.
          </p>
        </div>
        <Button variant={showAll ? 'primary' : 'secondary'} className="py-2 text-xs" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Actives seulement' : 'Voir aussi inactives'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.leaseId} className={`!p-4 ${!r.active ? 'opacity-75' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{r.localizationLine}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {r.buildingName} — {r.unitLabel}
                </h2>
                <p className="text-sm text-slate-600">{unitKindLabel(r.unitKind)}</p>
              </div>
              <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${statusClass(r.currentMonthStatusFr)}`}>
                {r.currentMonthStatusFr}
              </span>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Locataire</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{r.tenantFullName}</p>
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <p>
                  <span className="font-medium text-slate-500">Loyer mensuel :</span>{' '}
                  <span className="text-base font-bold text-slate-900">{fcfa(r.monthlyRent)}</span>
                </p>
                <p className="mt-1 text-slate-600">
                  <span className="font-medium text-slate-500">Jour d’échéance :</span> le {r.rentDueDay} de chaque mois
                </p>
              </div>
            </div>
            <Link to={`/locations/${r.leaseId}`} className="mt-4 inline-block text-sm font-medium text-brand-700">
              Ouvrir la fiche →
            </Link>
          </Card>
        ))}
      </div>

      {rows.length === 0 && (
        <Card>
          <p className="text-sm text-slate-600">Aucune location. Créez un bail depuis la page Baux.</p>
          <Link to="/baux" className="mt-2 inline-block text-sm font-medium text-brand-700">
            Aller aux baux
          </Link>
        </Card>
      )}
    </div>
  );
}
