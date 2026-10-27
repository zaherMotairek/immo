import { useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

type Props = {
  className?: string;
  /** Variante visuelle selon l’emplacement. */
  variant?: 'auth' | 'sidebar' | 'compact';
};

/**
 * Un clic → fenêtre d’installation native du navigateur (Chrome, Edge, Android, desktop).
 * Aucun guide manuel : si le navigateur ne propose pas l’install, message court uniquement.
 */
export function InstallAppButton({ className = '', variant = 'auth' }: Props) {
  const { installed, showInstallUi, promptInstall } = usePwaInstall();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!showInstallUi || installed) return null;

  async function onClick() {
    setStatus(null);
    setBusy(true);
    try {
      const result = await promptInstall();
      if (result === 'accepted') {
        setStatus(null);
        return;
      }
      if (result === 'dismissed') {
        setStatus('Installation annulée.');
        return;
      }
      setStatus('Installation indisponible pour le moment. Réessayez avec Chrome ou Edge.');
    } finally {
      setBusy(false);
    }
  }

  const baseBtn =
    variant === 'sidebar'
      ? 'w-full justify-start gap-2 rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--odoo-row-hover)]'
      : variant === 'compact'
        ? 'inline-flex items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-ink)] shadow-sm transition hover:bg-[var(--odoo-row-hover)]'
        : 'inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:bg-[var(--odoo-row-hover)]'

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        className={`inline-flex items-center ${baseBtn}`}
        title="Installer ImmoPilot sur cet appareil"
      >
        <svg className="size-4 shrink-0 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy ? 'Ouverture…' : 'Installer l’application'}
      </button>

      {status ? (
        <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-muted)]" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
