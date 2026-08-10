import { useEffect, useId, useRef, useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

type Props = {
  className?: string;
  /** Variante visuelle selon l’emplacement. */
  variant?: 'auth' | 'sidebar' | 'compact';
};

/**
 * Bouton pour installer ImmoPilot comme application (ordinateur + téléphone).
 */
export function InstallAppButton({ className = '', variant = 'auth' }: Props) {
  const { installed, canPrompt, needsIosGuide, showInstallUi, promptInstall, isIos } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!showInstallUi || installed) return null;

  async function onClick() {
    if (canPrompt) {
      setBusy(true);
      try {
        await promptInstall();
      } finally {
        setBusy(false);
      }
      return;
    }
    setOpen((v) => !v);
  }

  const baseBtn =
    variant === 'sidebar'
      ? 'w-full justify-start gap-2 rounded-xl border border-slate-700/90 bg-slate-800/50 px-3 py-2 text-[12px] font-medium text-slate-200 transition hover:bg-white/[0.07] hover:text-white'
      : variant === 'compact'
        ? 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300/90 bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200'
        : 'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300/90 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-zinc-500 dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-700';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        className={`inline-flex items-center ${baseBtn}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="Installer ImmoPilot sur cet appareil"
      >
        <svg className="size-4 shrink-0 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy ? 'Installation…' : 'Installer l’application'}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Comment installer ImmoPilot"
          className={`absolute z-30 mt-2 w-[min(100%,20rem)] rounded-xl border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed text-slate-700 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 ${
            variant === 'sidebar' ? 'bottom-full mb-2 mt-0 left-0 right-0 w-auto' : 'left-0 right-0'
          }`}
        >
          {needsIosGuide || isIos ? (
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                Touchez le bouton <strong>Partager</strong> (carré avec flèche) en bas de Safari.
              </li>
              <li>
                Choisissez <strong>Sur l’écran d’accueil</strong>.
              </li>
              <li>
                Validez <strong>Ajouter</strong> — ImmoPilot s’ouvre comme une appli.
              </li>
            </ol>
          ) : (
            <div className="space-y-2">
              <p>
                Sur <strong>Chrome</strong> ou <strong>Edge</strong> (ordinateur ou Android) : menu ⋮ →{' '}
                <strong>Installer ImmoPilot</strong> / <strong>Installer l’application</strong>.
              </p>
              <p className="text-slate-500 dark:text-zinc-400">
                Astuce : l’installation fonctionne pleinement en HTTPS (site en ligne) ou via{' '}
                <code className="rounded bg-slate-100 px-1 dark:bg-zinc-800">npm run preview</code> en local.
              </p>
            </div>
          )}
          <button
            type="button"
            className="mt-3 text-[11px] font-semibold text-slate-500 underline-offset-2 hover:underline dark:text-zinc-400"
            onClick={() => setOpen(false)}
          >
            Fermer
          </button>
        </div>
      ) : null}
    </div>
  );
}
