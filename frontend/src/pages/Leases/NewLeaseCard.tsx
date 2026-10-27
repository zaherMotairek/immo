import { Card, cn } from '@/components/ui/index';
import type { BuildingOpt, TenantOpt } from './types';
import { NewLeaseForm } from './NewLeaseForm';
import type { NewLeaseForm as NewLeaseFormState } from './useNewLeaseForm';

type NewLeaseCardProps = {
  form: NewLeaseFormState;
  buildingsAvailable: BuildingOpt[];
  tenants: TenantOpt[];
  onOpenQuickTenant: () => void;
};

/** Carte repliable « Enregistrer un nouveau bail » (ancre `#nouveau-bail`, défilement automatique à l'ouverture). */
export function NewLeaseCard({ form, buildingsAvailable, tenants, onOpenQuickTenant }: NewLeaseCardProps) {
  const open = form.addLeaseOpen;
  return (
    <div ref={form.addLeaseFormRef} id="nouveau-bail" className="scroll-mt-24">
      <Card padding="none" className="overflow-hidden">
        <button
          type="button"
          onClick={() => form.setAddLeaseOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="nouveau-bail-panel"
          className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-[var(--duration-fast)] hover:bg-[var(--odoo-row-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-brand-600/25 bg-brand-50 text-lg font-bold leading-none text-brand-700 dark:border-brand-500/40 dark:bg-brand-950/40 dark:text-brand-200"
            >
              +
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">Étape administrative</p>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">Enregistrer un nouveau bail</h2>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                {open ? 'Replier le formulaire' : 'Déplier pour saisir bien, locataire et loyer'}
              </p>
            </div>
          </div>
          <svg
            className={cn('size-5 shrink-0 text-[var(--color-muted)] transition-transform duration-200', open && 'rotate-180')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open ? (
          <div
            id="nouveau-bail-panel"
            className="border-t border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 pb-5 pt-4 sm:px-5"
          >
            <NewLeaseForm
              form={form}
              buildingsAvailable={buildingsAvailable}
              tenants={tenants}
              onOpenQuickTenant={onOpenQuickTenant}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
