import { useState } from 'react';
import { Button } from '@/components/ui/index';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { cn } from '@/components/ui/cn';

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

  const installIcon = (
    <svg className="size-4 shrink-0 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant === 'auth' ? 'secondary' : 'ghost'}
        size={variant === 'compact' ? 'sm' : 'md'}
        loading={busy}
        leftIcon={installIcon}
        onClick={() => void onClick()}
        className={cn(
          variant === 'sidebar' && 'w-full justify-start',
          variant === 'auth' && 'w-full',
        )}
        title="Installer ImmoPilot sur cet appareil"
      >
        {busy ? 'Ouverture…' : 'Installer l’application'}
      </Button>

      {status ? (
        <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-muted)]" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
