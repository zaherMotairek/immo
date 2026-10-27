import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppPageTitle, PageHeaderKpi } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { CautionsSummary } from './CautionsSummary';
import { CautionsTable } from './CautionsTable';
import { useCautionsData } from './useCautionsData';

/** Cautions encaissées : synthèse + tableau triable. `embedded` = onglet de « Cautions & charges ». */
export function CautionsEncaisséesPage({ embedded = false }: { embedded?: boolean }) {
  useRegisterRootSectionFallback();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const locationSheetState = useMemo(() => ({ backgroundLocation: routerLocation }), [routerLocation]);
  const data = useCautionsData();

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6'}>
      {embedded ? null : (
        <AppPageTitle
          iconTo="/cautions"
          title="Cautions encaissées"
          hintTitle="Baux avec dépôt marqué encaissé. Colonne « Mois » : équivalent en mois de loyer (caution ÷ loyer). Échéances : Paiements."
          actions={<PageHeaderKpi label="Total" value={String(data.rows.length)} />}
        />
      )}

      <CautionsSummary count={data.totals.count} sum={data.totals.sum} />

      <CautionsTable
        rows={data.rows}
        sortedRows={data.sortedRows}
        flashLeaseId={data.flashLeaseId}
        cautionSortKey={data.cautionSortKey}
        cautionSortDir={data.cautionSortDir}
        onSort={data.toggleCautionSort}
        navigate={navigate}
        locationSheetState={locationSheetState}
      />
    </div>
  );
}
