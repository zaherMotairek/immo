import { createContext, useCallback, useContext, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

type Ctx = { goBack: (fallbackHref: string) => void };

const NavigationContext = createContext<Ctx | null>(null);

/**
 * Compte les navigations in-app (PUSH) pour éviter navigate(-1) hors de l’appli
 * ou quand l’historique ne contient qu’une entrée (lien direct, onglet).
 */
export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  const depthRef = useRef(0);
  const skipFirstDepthEffect = useRef(true);

  useLayoutEffect(() => {
    if (skipFirstDepthEffect.current) {
      skipFirstDepthEffect.current = false;
      return;
    }
    if (navType === 'PUSH') depthRef.current += 1;
    else if (navType === 'POP') depthRef.current = Math.max(0, depthRef.current - 1);
  }, [location.pathname, location.search, location.key, navType]);

  const goBack = useCallback(
    (fallbackHref: string) => {
      if (depthRef.current > 0) {
        navigate(-1);
        return;
      }
      navigate(fallbackHref);
    },
    [navigate],
  );

  return <NavigationContext.Provider value={{ goBack }}>{children}</NavigationContext.Provider>;
}

export function useAppNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('NavigationProvider est requis (Layout).');
  return ctx;
}
