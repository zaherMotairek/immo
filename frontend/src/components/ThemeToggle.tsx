import { useTheme } from '@/theme/ThemeContext';

type ThemeToggleProps = {
  className?: string;
  /** Sur fond clair (auth / sidebar Option B) : bouton plus lisible. */
  tone?: 'default' | 'onLight';
};

/** Bascule clair / sombre (soleil en mode sombre, lune en mode clair). */
export function ThemeToggle({ className = '', tone = 'onLight' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  const toneClass =
    tone === 'onLight'
      ? 'border-[var(--odoo-border)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm hover:bg-[var(--odoo-row-hover)]'
      : 'border-[var(--odoo-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--odoo-row-hover)]';

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-input)] border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${toneClass} ${className}`}
      title={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      aria-label={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
    >
      {isDark ? (
        <svg className="size-4 shrink-0 text-brand-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zm8-8a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zM7 12a1 1 0 0 1-1 1H5a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zm12.071-6.071a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM7.05 16.95a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zm11.314 0a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414zM7.05 7.05a1 1 0 0 1-1.414 0L4.93 6.343a1 1 0 1 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414zM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
        </svg>
      ) : (
        <svg className="size-4 shrink-0 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z" />
        </svg>
      )}
      <span className="hidden sm:inline">{isDark ? 'Clair' : 'Sombre'}</span>
    </button>
  );
}
