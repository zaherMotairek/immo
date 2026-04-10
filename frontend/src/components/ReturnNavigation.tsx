import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@/components/PageDetailHero';

type Props = {
  /** Cible sûre si l’utilisateur ne veut pas utiliser l’historique (accueil, liste, etc.). */
  fallbackHref: string;
  fallbackLabel: string;
  className?: string;
};

/**
 * Démarche habituelle après une recherche ou un lien direct : revenir en arrière
 * dans l’historique, ou aller vers une page de référence connue.
 */
export function ReturnNavigation({ fallbackHref, fallbackLabel, className = '' }: Props) {
  const navigate = useNavigate();
  return (
    <nav
      className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm ${className}`}
      aria-label="Retour et raccourcis"
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-100/85 px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        title="Revenir à l’écran précédent (recherche, autre page…)"
      >
        <ChevronLeftIcon className="size-4 shrink-0 text-slate-500 dark:text-slate-400" />
        Retour
      </button>
      <span className="select-none text-slate-300 dark:text-slate-600" aria-hidden>
        ·
      </span>
      <Link
        to={fallbackHref}
        className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
      >
        {fallbackLabel}
      </Link>
    </nav>
  );
}
