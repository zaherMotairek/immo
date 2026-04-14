import type { LinkProps } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import { saveReturnFocusForPath, saveScrollForPath, type AppNavigateState } from '@/lib/navigation';

type Props = Omit<LinkProps, 'state'> & {
  state?: AppNavigateState;
  /** Identifiant stable de la ligne (ex. leaseId) pour retrouver la ligne au retour sur cette liste. */
  returnFocusId?: string;
};

/**
 * Lien interne qui mémorise la page d’origine (retour fil d’Ariane), la position de scroll
 * et optionnellement la ligne pour scroll + surbrillance au retour.
 */
export function SmartLink({ to, state, onClick, returnFocusId, ...rest }: Props) {
  const loc = useLocation();
  const merged: AppNavigateState = {
    ...(state as object),
    from: state?.from ?? loc.pathname + loc.search,
  };
  return (
    <Link
      to={to}
      state={merged}
      onClick={(e) => {
        const from = loc.pathname + loc.search;
        saveScrollForPath(from);
        if (returnFocusId) saveReturnFocusForPath(from, returnFocusId);
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
