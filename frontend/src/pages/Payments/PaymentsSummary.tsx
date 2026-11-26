import type { ReactNode } from 'react';
import { SmartLink } from '@/components/SmartLink';
import { Card, StatTile } from '@/components/ui/index';
import { useFinanceSummary } from '@/hooks/useFinanceSummary';
import { fcfa } from '@/lib/format';
import type { CollectionTotal, PaymentStats } from './types';

type PaymentsSummaryProps = {
  stats: PaymentStats;
  monthCount: number;
  collectionTotals: CollectionTotal[];
};

const eyebrow = 'text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]';

/** Montant en vedette : filet de statut, libellé, gros chiffre tabulaire, précision. */
function MoneyHero({
  label,
  amount,
  accent,
  children,
}: {
  label: string;
  amount: number;
  /** Variable CSS de statut (ex. `--status-pending`). */
  accent: string;
  children: ReactNode;
}) {
  return (
    <Card padding="none" className="relative overflow-hidden px-4 pb-4 pt-4 max-lg:px-3 max-lg:pb-3 max-lg:pt-3 lg:px-5 lg:pb-5 lg:pt-6">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: `var(${accent})` }} />
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `var(${accent})` }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold leading-tight tracking-tight tabular-nums text-[var(--color-ink)] sm:text-3xl lg:text-4xl">
        {fcfa(amount)}
      </p>
      <div className="mt-2 text-sm text-[var(--color-muted)]">{children}</div>
    </Card>
  );
}

/** Synthèse du filtre actif : reste à encaisser et encaissé en grand, puis volumes et encaissements par mode. */
export function PaymentsSummary({ stats, monthCount, collectionTotals }: PaymentsSummaryProps) {
  const { data: monthRef } = useFinanceSummary();
  return (
    <section aria-label="Synthèse du filtre actif">
      {monthRef ? (
        <p className="mb-2 text-xs text-[var(--color-muted)]">
          Réf. mois {String(monthRef.month).padStart(2, '0')}/{monthRef.year} (source unique) : attendu{' '}
          {fcfa(monthRef.expectedMonthlyRent)} · encaissé {fcfa(monthRef.collectedThisMonth)} · retards{' '}
          {monthRef.overdueCount}
        </p>
      ) : null}
      <p className={`mb-3 ${eyebrow}`}>Synthèse (filtre actif)</p>
      <div className="grid gap-4 md:grid-cols-2">
        <MoneyHero label="Reste à encaisser (loyers)" amount={stats.aEncaisser} accent="--status-pending">
          {stats.retards > 0 ? (
            <span className="font-semibold text-[var(--status-late)]">{stats.retards} en retard</span>
          ) : (
            'Aucun retard dans cette vue'
          )}
        </MoneyHero>
        <MoneyHero label="Encaissé (loyers)" amount={stats.encaisse} accent="--status-paid">
          {stats.payees} soldée{stats.payees !== 1 ? 's' : ''}
          {stats.partialLines > 0 ? ` · ${stats.partialLines} acompte${stats.partialLines !== 1 ? 's' : ''}` : ''}
          <span className="mt-1 block">
            Hors caution —{' '}
            <SmartLink to="/cautions" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
              cautions encaissées
            </SmartLink>
            .
          </span>
        </MoneyHero>
      </div>

      <div className="mt-3 hidden grid-cols-2 gap-3 sm:grid lg:grid-cols-4">
        <StatTile label="Échéances" value={stats.total} sub="Lignes affichées" />
        <StatTile label="Regroupement" value={`${monthCount} mois`} sub="Par mois de facturation" />
        {collectionTotals.length === 0 ? (
          <Card padding="sm" className="col-span-2">
            <p className="text-sm text-[var(--color-muted)]">Aucun encaissement saisi par mode sur ce filtre.</p>
          </Card>
        ) : (
          collectionTotals.map((row) => (
            <StatTile key={row.key} label={row.label} value={fcfa(row.total)} />
          ))
        )}
      </div>
    </section>
  );
}
