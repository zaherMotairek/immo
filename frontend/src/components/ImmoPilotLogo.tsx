import { useId } from 'react';

type Props = {
  className?: string;
  /** Affiche le nom à côté de la marque. */
  withWordmark?: boolean;
  /** Variante claire (panneau sombre) ou sombre (fond clair). */
  tone?: 'onDark' | 'onLight';
};

/**
 * Marque ImmoPilot : pictogramme bâtiment + accent ambre.
 */
export function ImmoPilotLogo({ className = '', withWordmark = false, tone = 'onDark' }: Props) {
  const gid = useId().replace(/:/g, '');
  const word = tone === 'onDark' ? 'text-zinc-50' : 'text-zinc-900 dark:text-zinc-50';

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        className="size-11 shrink-0 sm:size-12"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={withWordmark ? true : undefined}
        role={withWordmark ? undefined : 'img'}
        aria-label={withWordmark ? undefined : 'ImmoPilot'}
      >
        <defs>
          <linearGradient id={`ipLogoFace-${gid}`} x1="16" y1="12" x2="64" y2="68" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2a2a30" />
            <stop offset="1" stopColor="#141418" />
          </linearGradient>
        </defs>
        <rect width="80" height="80" rx="20" fill={`url(#ipLogoFace-${gid})`} />
        <rect x="1.25" y="1.25" width="77.5" height="77.5" rx="18.75" stroke="#fff" strokeOpacity="0.1" />
        <path fill="#f4f4f5" d="M22 54V32.2L40 20l18 12.2V54h-8.5V40.5H30.5V54H22Z" />
        <rect x="35.5" y="44" width="9" height="10" rx="1.2" fill="#141418" />
        <path fill="#d4a84b" d="M40 24.5 44.8 28H35.2L40 24.5Z" />
        <rect x="24" y="58" width="32" height="3.5" rx="1.75" fill="#d4a84b" />
      </svg>
      {withWordmark ? (
        <span className={`auth-shell__wordmark text-2xl font-extrabold tracking-tight sm:text-3xl ${word}`}>
          ImmoPilot
        </span>
      ) : null}
    </span>
  );
}
