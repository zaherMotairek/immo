import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PaymentPartialDialog } from '@/components/PaymentPartialDialog';
import { PaymentZoomModal } from '@/components/PaymentZoomModal';
import { Button, Callout, EmptyState, Skeleton } from '@/components/ui/index';
import { usePartialPayment } from '@/components/usePartialPayment';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { PaymentsBulkBar } from './PaymentsBulkBar';
import { PaymentsBulkCollectModal } from './PaymentsBulkCollectModal';
import { PaymentsFilters } from './PaymentsFilters';
import { PaymentsHeader } from './PaymentsHeader';
import { PaymentsMonthList } from './PaymentsMonthList';
import { PaymentsStatementImport } from './PaymentsStatementImport';
import { PaymentsSummary } from './PaymentsSummary';
import { PaymentsToolbar } from './PaymentsToolbar';
import { usePaymentsFilters } from './usePaymentsFilters';
import { usePaymentsList } from './usePaymentsList';
import { usePaymentsSelection } from './usePaymentsSelection';

/** Page Paiements : filtres (URL) → chargement des échéances → composition des sections. */
export function PaymentsPage() {
  useRegisterRootSectionFallback();
  const routerLocation = useLocation();
  const locationSheetState = useMemo(() => ({ backgroundLocation: routerLocation }), [routerLocation]);

  const filters = usePaymentsFilters();
  const list = usePaymentsList(filters);
  const selection = usePaymentsSelection({
    rows: list.rows,
    visibleRows: list.visibleRows,
    methodFilter: filters.methodFilter,
    load: list.load,
  });
  const [zoomPaymentId, setZoomPaymentId] = useState<string | null>(null);

  /** Après fermeture du dialogue, la mise en page change : on attend le prochain frame, on mémorise le scroll puis on recharge. */
  const partial = usePartialPayment((paymentId) => {
    window.setTimeout(() => {
      list.scheduleScrollRestoreBeforeLoad(paymentId, window.scrollY);
      list.load();
    }, 0);
  });

  useEffect(() => {
    if (!zoomPaymentId) return;
    if (!list.rows.some((r) => r.id === zoomPaymentId)) setZoomPaymentId(null);
  }, [list.rows, zoomPaymentId]);

  return (
    <div className="space-y-4 pb-10 sm:space-y-6">
      <PaymentsHeader
        totalCount={list.visibleRows.length}
        worksheetPdfPath={filters.worksheetPdfPath}
        focusPaymentId={filters.focusPaymentId}
        onClearFocus={() => filters.updateParams((q) => q.delete('focus'), true)}
        leaseIdFilter={filters.leaseIdFilter}
        leaseFocusSummary={list.leaseFocusSummary}
        onClearLease={filters.clearLeaseFilter}
        locationSheetState={locationSheetState}
      />

      <PaymentsToolbar
        yearFilter={filters.yearFilter}
        monthFilter={filters.monthFilter}
        overdueOnly={filters.overdueOnly}
        panelOpen={Boolean(zoomPaymentId)}
        onClosePanel={() => setZoomPaymentId(null)}
      />

      <PaymentsFilters f={filters} leaseFocusSummary={list.leaseFocusSummary} />

      <PaymentsStatementImport onDone={list.load} />

      {list.listErr ? (
        <Callout variant="danger" title="Les échéances n’ont pas pu être chargées">
          <p>{list.listErr}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={list.load}>
            Réessayer
          </Button>
        </Callout>
      ) : null}

      {!list.paymentsReady && !list.listErr ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Chargement des échéances">
          <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
        </div>
      ) : null}

      {!list.listErr && list.visibleRows.length > 0 ? (
        <PaymentsSummary stats={list.stats} monthCount={list.monthGroups.length} collectionTotals={list.collectionTotals} />
      ) : null}

      <div className="space-y-5">
        {!list.listErr && selection.selectedPaymentIds.length > 0 ? (
          <PaymentsBulkBar
            selectedCount={selection.selectedPaymentIds.length}
            payableCount={selection.selectableCount}
            submitting={selection.bulkSubmitting}
            onMarkPaid={selection.openCollectModal}
            onClear={selection.clearSelection}
          />
        ) : null}
      <PaymentsBulkCollectModal
        open={selection.collectOpen}
        count={selection.selectableCount}
        submitting={selection.bulkSubmitting}
        onClose={() => selection.setCollectOpen(false)}
        onConfirm={(v) => void selection.confirmCollect(v)}
      />
        {!list.listErr && list.monthGroups.length > 0 ? (
          <PaymentsMonthList
            monthGroups={list.monthGroups}
            totalRows={list.rows.length}
            collapsedMonthKeys={list.collapsedMonthKeys}
            onToggleMonth={list.toggleMonth}
            onCollapseAll={list.collapseAllMonths}
            onExpandAll={list.expandAllMonths}
            sort={list.sort}
            selectedIds={selection.selectedPaymentIds}
            onToggle={selection.togglePaymentSelection}
            onToggleAll={selection.toggleAllInMonth}
            zoomPaymentId={zoomPaymentId}
            flashPaymentRowId={list.flashPaymentRowId}
            onOpen={setZoomPaymentId}
          />
        ) : null}
      </div>

      <PaymentZoomModal
        paymentId={zoomPaymentId}
        onClose={() => setZoomPaymentId(null)}
        onUpdated={() => {
          if (zoomPaymentId) list.scheduleScrollRestoreBeforeLoad(zoomPaymentId, window.scrollY);
          list.load();
        }}
      />

      {list.paymentsReady && !list.listErr && list.visibleRows.length === 0 ? (
        <EmptyState
          title="Aucune échéance pour ce filtre"
          description="Essayez une autre année, un autre mois, ou « Toutes les années » / « Tous les mois »."
        />
      ) : null}

      <PaymentPartialDialog state={partial} idPrefix="partial-pay" closeOnEscape />
    </div>
  );
}
