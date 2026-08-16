import { useEffect, useId, useRef, useState } from 'react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

type Props = {
  className?: string;
  /** Variante visuelle selon l’emplacement. */
  variant?: 'auth' | 'sidebar' | 'compact';
};

/**
 * Bouton pour installer ImmoPilot comme application (ordinateur + téléphone + tablette).
 * Sur Chrome/Edge/Android (HTTPS) : ouvre la boîte d’installation native.
 * Sur iOS Safari : Apple n’autorise pas l’API — guide court uniquement.
 */
export function InstallAppButton({ className = '', variant = 'auth' }: Props) {
  const { installed, canPrompt, needsIosGuide, showInstallUi, promptInstall, isIos, isSecureContext } =
    usePwaInstall();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
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
    setHint(null);

    // iOS : pas d’API native — seul Safari « Sur l’écran d’accueil »
    if (isIos || needsIosGuide) {
      setOpen((v) => !v);
      return;
    }

    if (!isSecureContext) {
      setOpen(true);
      setHint(
        'L’installation automatique nécessite HTTPS (site en ligne) ou localhost. Avec une adresse du type 192.168.x.x en HTTP, le navigateur refuse le prompt natif.',
      );
      return;
    }

    setBusy(true);
    try {
      const result = await promptInstall();
      if (result === 'accepted') {
        setOpen(false);
        return;
      }
      if (result === 'dismissed') {
        setHint('Installation annulée.');
        return;
      }
      setOpen(true);
      setHint(
        canPrompt
          ? 'Le navigateur n’a pas ouvert la fenêtre. Réessayez depuis Chrome ou Edge.'
          : 'Ouvrez le site en HTTPS (version déployée), puis réessayez : le navigateur affichera alors « Installer ImmoPilot ». En local de développement (npm run dev), le service worker est désactivé — utilisez un build preview ou la prod.',
      );
    } finally {
      setBusy(false);
    }
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
        title="Installer ImmoPilot comme application"
      >
        <svg className="size-4 shrink-0 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy ? 'Installation…' : 'Installer l’application'}
      </button>

      {hint && !open ? (
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-zinc-400" role="status">
          {hint}
        </p>
      ) : null}

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Installation ImmoPilot"
          className={`absolute z-30 mt-2 w-[min(100%,20rem)] rounded-xl border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed text-slate-700 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 ${
            variant === 'sidebar' ? 'bottom-full mb-2 mt-0 left-0 right-0 w-auto' : 'left-0 right-0'
          }`}
        >
          {needsIosGuide || isIos ? (
            <div className="space-y-2">
              <p className="font-semibold text-slate-800 dark:text-zinc-100">iPhone / iPad (Safari)</p>
              <p>
                Apple n’autorise pas l’installation en un clic. Ajoutez ImmoPilot à l’écran d’accueil :
              </p>
              <ol className="list-decimal space-y-1.5 pl-4">
                <li>
                  Touchez <strong>Partager</strong> (carré avec flèche).
                </li>
                <li>
                  Choisissez <strong>Sur l’écran d’accueil</strong>.
                </li>
                <li>
                  Validez <strong>Ajouter</strong>.
                </li>
              </ol>
            </div>
          ) : (
            <p>{hint ?? 'Sur Chrome ou Edge en HTTPS, le bouton ouvre la fenêtre d’installation native.'}</p>
          )}
          <button
            type="button"
            className="mt-3 text-[11px] font-semibold text-slate-500 underline-offset-2 hover:underline dark:text-zinc-400"
            onClick={() => {
              setOpen(false);
              setHint(null);
            }}
          >
            Fermer
          </button>
        </div>
      ) : null}
    </div>
  );
}
