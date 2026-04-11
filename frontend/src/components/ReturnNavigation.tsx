import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from '@/components/PageDetailHero';
import { useAppNavigation } from '@/context/NavigationContext';

type Props = {
  /** Cible sûre si l’utilisateur ne veut pas utiliser l’historique (accueil, liste, etc.). */
  fallbackHref: string;
  fallbackLabel: string;
  className?: string;
};

/**
 * Revenir à l’écran précédent dans l’appli si l’historique le permet, sinon
 * utiliser le lien de secours (lien direct, onglet, navigation remplacée).
 */
export function ReturnNavigation({ fallbackHref, fallbackLabel, className = '' }: Props) {
  const { goBack } = useAppNavigation();
  return (
    <nav
      className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm ${className}`}
      aria-label="Retour et raccourcis"
    >
      <button
        type="button"
        onClick={() => goBack(fallbackHref)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-100/85 px-3 py-1.5 font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        title="Revenir à la page précédente dans l’appli, ou utiliser le lien à droite si ce n’est pas possible"
      >
        <ChevronLeftIcon className="size-4 shrink-0 text-slate-600 dark:text-slate-300" />
        Retour
      </button>
      <span className="select-none text-slate-400 dark:text-slate-500" aria-hidden>
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
