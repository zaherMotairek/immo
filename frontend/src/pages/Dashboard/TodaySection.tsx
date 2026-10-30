import { SmartLink } from '@/components/SmartLink';
import { Card, Skeleton } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import type { TodayAgenda, TodayAgendaItem } from '@/hooks/useFinanceSummary';

const KIND_LABEL: Record<TodayAgendaItem['kind'], string> = {
  remind: 'À relancer',
  late: 'Retard ancien',
  lease_ending: 'Fin de bail',
  collector_validate: 'Collecte à valider',
  deposit_pending: 'Caution',
};

type Props = {
  agenda: TodayAgenda | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function TodaySection({ agenda, loading, error, onRetry }: Props) {
  if (loading && !agenda) {
    return <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />;
  }
  if (error) {
    return (
      <Card padding="md">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
        <button type="button" className="mt-2 text-sm underline" onClick={onRetry}>
          Réessayer
        </button>
      </Card>
    );
  }
  if (!agenda) return null;

  const total =
    agenda.counts.remind +
    agenda.counts.late +
    agenda.counts.leaseEnding +
    agenda.counts.collectorValidate +
    agenda.counts.depositPending;

  return (
    <section aria-labelledby="today-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="today-heading" className="text-lg font-semibold text-[var(--color-ink)]">
            Aujourd’hui
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            À faire au {agenda.asOf} — {total} action{total > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
          <span>Relances {agenda.counts.remind}</span>
          <span>· Retards {agenda.counts.late}</span>
          <span>· Fins de bail {agenda.counts.leaseEnding}</span>
          <span>· Collectes {agenda.counts.collectorValidate}</span>
          <span>· Cautions {agenda.counts.depositPending}</span>
        </div>
      </div>

      {agenda.items.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-[var(--color-muted)]">Rien d’urgent pour aujourd’hui.</p>
        </Card>
      ) : (
        <ul className="divide-y divide-[var(--odoo-border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)]">
          {agenda.items.slice(0, 12).map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <SmartLink
                to={item.href}
                className="flex items-start justify-between gap-3 px-4 py-3 no-underline transition hover:bg-[var(--color-surface-2)]"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    {KIND_LABEL[item.kind]}
                  </p>
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
                  <p className="truncate text-xs text-[var(--color-muted)]">{item.subtitle}</p>
                </div>
                {item.amount != null ? (
                  <p className="shrink-0 tabular-nums text-sm font-semibold text-[var(--color-ink)]">
                    {fcfa(item.amount)}
                  </p>
                ) : null}
              </SmartLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
