import type { LinkProps } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import { saveScrollForPath, type AppNavigateState } from '@/lib/navigation';

type Props = Omit<LinkProps, 'state'> & {
  state?: AppNavigateState;
};

/**
 * Lien interne qui mémorise la page d’origine (retour fil d’Ariane) et la position de scroll.
 */
export function SmartLink({ to, state, onClick, ...rest }: Props) {
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
        saveScrollForPath(loc.pathname + loc.search);
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
