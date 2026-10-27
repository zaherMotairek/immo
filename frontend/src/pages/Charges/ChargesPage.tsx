import { useLocation } from 'react-router-dom';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { periodLabel } from './chargeUtils';
import { ChargesList } from './ChargesList';
import { ChargesPeriodBar } from './ChargesPeriodBar';
import { ChargesSummary } from './ChargesSummary';
import { NewChargeCard } from './NewChargeCard';
import { useChargesData } from './useChargesData';
import { useNewChargeForm } from './useNewChargeForm';

/** Charges & impôts : période (URL), synthèse, saisie d'une charge et détail. `embedded` = onglet de « Cautions & charges ». */
export function ChargesPage({ embedded = false }: { embedded?: boolean }) {
  useRegisterRootSectionFallback();
  const routerLocation = useLocation();
  const returnLocation = `${routerLocation.pathname}${routerLocation.search}`;
  const data = useChargesData();
  const form = useNewChargeForm({ y: data.y, viewMonth: data.viewMonth, buildings: data.buildings, onCreated: data.load });

  const periodeLibelle = periodLabel(data.y, data.viewMonth);

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6'}>
      {data.focusChargeId ? (
        <p className="-mt-2 text-xs text-[var(--color-muted)]">
          <button
            type="button"
            className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
            onClick={data.clearFocus}
          >
            Fermer la surbrillance (lien direct)
          </button>
        </p>
      ) : null}

      <ChargesPeriodBar
        embedded={embedded}
        count={data.rows.length}
        y={data.y}
        viewMonth={data.viewMonth}
        onYearChange={data.setY}
        onMonthChange={data.setViewMonth}
      />

      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        Synthèse et liste : <strong className="font-semibold text-[var(--color-ink)]">{periodeLibelle}</strong>
        {data.viewMonth === 'all'
          ? ' — inclut les charges libellées « année entière » (sans mois au formulaire).'
          : ' — uniquement les charges imputées à ce mois.'}
        <span className="ml-1 tabular-nums">· {data.rows.length} charge(s)</span>
      </p>

      {data.summary ? <ChargesSummary summary={data.summary} periodeLibelle={periodeLibelle} /> : null}

      <NewChargeCard form={form} buildings={data.buildings} />

      <ChargesList
        rows={data.rows}
        periodeLibelle={periodeLibelle}
        returnLocation={returnLocation}
        flashChargeId={data.flashChargeId}
        togglingPaidId={data.togglingPaidId}
        onSetPaid={(id, paid) => void data.setPaid(id, paid)}
        onRemove={(id) => void data.remove(id)}
      />
    </div>
  );
}
