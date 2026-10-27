import { lazy, Suspense, type ReactNode } from 'react';
import { KpiIconAlert, KpiIconMoney, KpiIconTrendUp, KpiIconUnits } from '@/components/dashboardKpiIcons';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { SmartLink } from '@/components/SmartLink';
import { HelpHint } from '@/components/ui';
import { Skeleton } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import type { CoveragePieSlice } from './CoveragePieChart';
import type { Overview } from './types';

export type { CoveragePieSlice };

const CoveragePieChart = lazy(() =>
  import('./CoveragePieChart').then((m) => ({ default: m.CoveragePieChart })),
);

type FinanceSectionProps = {
  kpis: Overview['kpis'];
  coveragePieData: CoveragePieSlice[] | null;
  monthLabelCap: string;
  rangeLabel: string;
  pctOfExpected: number | null;
  remainingVsExpected: number;
};

type KpiTone = 'ok' | 'neutral' | 'warn';

const TONE_LABEL: Record<KpiTone, string> = {
  ok: 'text-[var(--status-paid)]',
  neutral: 'text-[var(--color-muted)]',
  warn: 'text-[var(--status-pending)]',
};

const TONE_CAPTION: Record<KpiTone, string> = {
  ok: 'text-[var(--status-paid)]',
  neutral: 'text-[var(--color-muted)]',
  warn: 'text-[var(--status-pending)]',
};

function KpiTile({
  tone,
  label,
  help,
  value,
  caption,
  icon,
}: {
  tone: KpiTone;
  label: string;
  help?: string;
  value: string;
  caption?: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className={`dashboard-kpi dashboard-kpi--${tone} bg-[var(--color-surface)] p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${TONE_LABEL[tone]}`}>{label}</p>
            {help ? <HelpHint title={help} /> : null}
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-[var(--color-ink)]">{value}</p>
          {caption ? <p className={`mt-1.5 text-xs font-medium ${TONE_CAPTION[tone]}`}>{caption}</p> : null}
        </div>
        <span className={`dashboard-kpi__icon dashboard-kpi__icon--${tone}`} aria-hidden>
          {icon}
        </span>
      </div>
    </div>
  );
}

/** Synthèse du mois : bandeau (couverture + PDF), tuiles KPI, anneau encaissé/reste, cautions. */
export function FinanceSection({
  kpis,
  coveragePieData,
  monthLabelCap,
  rangeLabel,
  pctOfExpected,
  remainingVsExpected,
}: FinanceSectionProps) {
  return (
    <section className="dashboard-finance overflow-hidden rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
      <div className="dashboard-finance__hero relative px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Synthèse · mois en cours
            </p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-[2rem]">{monthLabelCap}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{rangeLabel}</p>
            {pctOfExpected !== null ? (
              <div className="mt-4 max-w-sm">
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-[var(--color-ink)]">Couverture des loyers</span>
                  <span className="font-semibold tabular-nums text-[var(--status-paid)]">{pctOfExpected}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--odoo-border-subtle)]">
                  <div
                    className="dashboard-finance__bar h-full rounded-full bg-[var(--status-paid)]"
                    style={{ width: `${Math.min(100, Math.max(0, pctOfExpected))}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="shrink-0">
            <PdfPrintButton
              path="/dashboard/worksheet.pdf"
              title="Feuille de route PDF : cases « perçu », notes manuscrites, puis saisie dans Paiements"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-[var(--odoo-border)] sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          tone="ok"
          label="Encaissé (loyers)"
          value={fcfa(kpis.collectedThisMonth)}
          caption={pctOfExpected !== null ? `${pctOfExpected}% de l’attendu` : 'Attendu non renseigné'}
          icon={<KpiIconMoney className="size-5" />}
        />
        <KpiTile
          tone="neutral"
          label="Attendu ce mois"
          value={fcfa(kpis.expectedMonthlyRent)}
          caption="Loyers mensuels actifs"
          icon={<KpiIconTrendUp className="size-5" />}
        />
        <KpiTile
          tone="neutral"
          label="Reste (vs attendu)"
          help="Écart entre le total attendu du mois et les loyers déjà encaissés sur les échéances du mois (indicateur de couverture, pas un solde comptable)."
          value={fcfa(remainingVsExpected)}
          icon={<KpiIconUnits className="size-5" />}
        />
        <KpiTile
          tone="warn"
          label="Retards / impayés"
          help="Total restant dû sur les échéances en retard ou impayées."
          value={fcfa(kpis.overdueAmount)}
          caption={`${kpis.overdueCount} échéance(s)`}
          icon={<KpiIconAlert className="size-5" />}
        />
      </div>

      {coveragePieData ? (
        <div
          className="border-t border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-5 sm:px-6"
          role="img"
          aria-label={`Encaissement du mois : ${pctOfExpected ?? 0} pour cent du loyer attendu encaissé, reste ${fcfa(remainingVsExpected)} à percevoir.`}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-10">
            <div className="min-w-0 flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <p className="text-sm font-semibold text-[var(--color-ink)]">Encaissé vs reste (loyer attendu)</p>
                <HelpHint title="Graphique sur la base du loyer mensuel attendu (baux actifs). « Reste » = différence avec ce qui est déjà encaissé ce mois sur les échéances du mois. En début de mois, l’anneau est souvent très « reste » : les échéances arrivent plus tard." />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
                Même indicateur que la carte « Encaissé » ({pctOfExpected !== null ? `${pctOfExpected}%` : '—'} de
                l’attendu), en vue proportionnelle.
              </p>
              <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs tabular-nums md:justify-start">
                <li className="flex items-center gap-2 text-[var(--color-ink)]">
                  <span className="size-2.5 shrink-0 rounded-full bg-[var(--status-paid)]" aria-hidden />
                  <span>
                    Encaissé · <strong>{fcfa(Math.min(kpis.collectedThisMonth, kpis.expectedMonthlyRent))}</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2 text-[var(--color-ink)]">
                  <span className="size-2.5 shrink-0 rounded-full bg-[var(--color-muted)]" aria-hidden />
                  <span>
                    Reste à percevoir · <strong>{fcfa(remainingVsExpected)}</strong>
                  </span>
                </li>
              </ul>
            </div>
            <div className="relative mx-auto h-[200px] w-[200px] min-h-[200px] min-w-[200px] shrink-0 md:mx-0">
              <Suspense fallback={<Skeleton className="h-full w-full rounded-full" />}>
                <CoveragePieChart data={coveragePieData} />
              </Suspense>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-0.5">
                {pctOfExpected !== null ? (
                  <>
                    <span className="text-2xl font-bold tabular-nums text-[var(--color-ink)]">{pctOfExpected}%</span>
                    <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                      encaissé
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-[var(--color-muted)]">—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--odoo-border)] px-4 py-3 text-sm text-[var(--color-muted)] sm:px-6">
        <span>
          Cautions encaissées ce mois :{' '}
          <span className="font-semibold tabular-nums text-[var(--color-ink)]">{fcfa(kpis.depositsCollectedThisMonth)}</span>
        </span>
        <span aria-hidden>·</span>
        <SmartLink
          to="/cautions"
          className="font-semibold text-[var(--color-brand-800)] underline-offset-2 hover:underline dark:text-[var(--color-brand-300)]"
        >
          Voir les cautions →
        </SmartLink>
      </div>
    </section>
  );
}
