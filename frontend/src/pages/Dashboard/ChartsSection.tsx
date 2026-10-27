import { useLayoutEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiIconAlert } from '@/components/dashboardKpiIcons';
import { SmartLink } from '@/components/SmartLink';
import { HelpHint } from '@/components/ui';
import { Card } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import { dashboardLinkButtonClass } from './types';
import type { Overview } from './types';

/** Graphique à barres du mois + carte « Impayés / retard ». */
export function ChartsSection({ kpis }: { kpis: Overview['kpis'] }) {
  const barChartWrapRef = useRef<HTMLDivElement>(null);
  const [barChartW, setBarChartW] = useState(0);

  useLayoutEffect(() => {
    const el = barChartWrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setBarChartW(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dashboardBars = [
    { key: 'expected', label: 'Attendu', value: kpis.expectedMonthlyRent, color: 'var(--color-muted)' },
    { key: 'collected', label: 'Encaissé', value: kpis.collectedThisMonth, color: 'var(--status-paid)' },
    { key: 'deposits', label: 'Cautions', value: kpis.depositsCollectedThisMonth, color: 'var(--color-brand-400)' },
    { key: 'overdue', label: 'Retards', value: kpis.overdueAmount, color: 'var(--status-pending)' },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-[var(--color-ink)]">Vue rapide en graphique</h2>
          <HelpHint title="Comparatif direct des montants clés du mois. Gris : attendu, vert foncé : encaissé, vert clair : cautions, orange : retards." />
        </div>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          Les montants encaissés et cautions sont aussi détaillés dans la synthèse du mois ci-dessus — pas de doublon en dessous.
        </p>
        <div ref={barChartWrapRef} className="h-[240px] w-full min-h-[240px] min-w-0">
          {barChartW > 0 ? (
            <BarChart width={barChartW} height={240} data={dashboardBars} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--odoo-border)" opacity={0.6} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-ink)', fontSize: 12, fontWeight: 600 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                formatter={(v) => [fcfa(Number(v)), 'Montant']}
                labelStyle={{ fontWeight: 700 }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={58}>
                {dashboardBars.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : null}
        </div>
      </Card>
      <Card
        className="lg:col-span-2"
        style={
          kpis.overdueCount > 0
            ? { borderColor: 'var(--status-pending)', backgroundColor: 'var(--status-pending-bg)' }
            : undefined
        }
      >
        <h2 className="flex items-center gap-2 font-semibold text-[var(--color-ink)]">
          <KpiIconAlert className="h-5 w-5 shrink-0 text-[var(--status-pending)]" />
          Impayés / retard
        </h2>
        <p className="mt-3 text-3xl font-bold tabular-nums text-[var(--status-pending)]">{fcfa(kpis.overdueAmount)}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{kpis.overdueCount} échéance(s) concernée(s)</p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
          Traiter les retards depuis les paiements ou les fiches location. Les alertes détaillées suivent plus bas.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <SmartLink to="/locations" className={dashboardLinkButtonClass}>
            Locations →
          </SmartLink>
          <SmartLink to="/paiements?overdue=1" className={dashboardLinkButtonClass}>
            Paiements en retard →
          </SmartLink>
        </div>
      </Card>
    </div>
  );
}
