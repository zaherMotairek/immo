/** Écran de chargement cohérent avec la marque (session, données page). */
export function AppLoadingScreen({ message = 'Chargement…' }: { message?: string }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--color-app-bg-deep)] px-6 dark:bg-[#0b0c0f]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center gap-3">
          <span
            className="hidden h-10 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-sky-400 to-brand-600 sm:block"
            aria-hidden
          />
          <div className="text-center sm:text-left">
            <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">ImmoPilot</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Gestion locative
            </p>
          </div>
        </div>
        <svg
          className="size-10 animate-spin text-brand-600 dark:text-brand-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    </div>
  );
}
