import type { ReactNode } from 'react';

type Props = {
  /** Texte affiché au survol et pour les lecteurs d’écran (infobulle native). */
  text: string;
  /** Préfixe du libellé accessibilité. */
  label?: string;
  className?: string;
};

/**
 * Petite icône « i » : l’aide détaillée est dans l’infobulle (title) pour ne pas encombrer l’écran.
 */
export function FieldHelp({ text, label = 'Aide', className = '' }: Props) {
  const aria = `${label}: ${text}`;
  return (
    <button
      type="button"
      title={text}
      aria-label={aria}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300/90 bg-slate-100 text-slate-600 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ${className}`}
    >
      <span className="select-none text-[11px] font-bold leading-none" aria-hidden>
        i
      </span>
    </button>
  );
}

/** Ligne label + enfants + aide optionnelle (alignés). */
export function LabelWithHelp({
  htmlFor,
  children,
  help,
  className = '',
}: {
  htmlFor?: string;
  children: ReactNode;
  help?: string;
  className?: string;
}) {
  return (
    <div className={`mb-1 flex items-center gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
      >
        {children}
      </label>
      {help ? <FieldHelp text={help} label={String(children)} /> : null}
    </div>
  );
}
