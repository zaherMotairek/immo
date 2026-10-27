import { cn } from './cn';

export type StepperStep = { id: string; label: string };

export type StepperProps = {
  steps: StepperStep[];
  activeId: string;
  className?: string;
};

/** Indicateur d'étapes (lecture seule) : étapes passées cochées, étape courante mise en avant. */
export function Stepper({ steps, activeId, className }: StepperProps) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === activeId),
  );

  return (
    <nav aria-label="Progression" className={className}>
      <p className="mb-2 text-xs font-semibold text-[var(--color-muted)] sm:hidden">
        Étape {activeIndex + 1} sur {steps.length}
      </p>
      <ol className="flex items-center gap-2">
        {steps.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li
              key={step.id}
              aria-current={active ? 'step' : undefined}
              className={cn('flex items-center gap-2', i < steps.length - 1 && 'min-w-0 flex-1')}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums',
                  done && 'border-brand-600 bg-brand-600 text-white',
                  active && 'border-brand-600 bg-[var(--color-surface)] text-brand-700 ring-2 ring-brand-600/25',
                  !done && !active && 'border-[var(--odoo-border)] bg-[var(--color-surface)] text-[var(--color-muted)]',
                )}
              >
                {done ? (
                  <svg
                    aria-hidden
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  'truncate text-sm',
                  active ? 'font-semibold text-[var(--color-ink)]' : 'hidden text-[var(--color-muted)] sm:inline',
                )}
              >
                {step.label}
                {done ? <span className="sr-only"> (terminée)</span> : null}
              </span>
              {i < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn('h-px min-w-4 flex-1', done ? 'bg-brand-600' : 'bg-[var(--odoo-border)]')}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
