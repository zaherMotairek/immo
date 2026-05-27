/* eslint-disable react-refresh/only-export-components -- provider + hooks dans un seul fichier (pattern stable). */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

type Ctx = {
  goBack: (fallbackHref: string) => void;
  /** Cible de secours du bouton « Retour » / fil d’Ariane (page courante). */
  setReturnFallback: (href: string) => void;
  /** Même logique que « Retour » : historique in-app ou fallback enregistré. */
  goBackWithRegisteredFallback: () => void;
};

const NavigationContext = createContext<Ctx | null>(null);

/** Retour arrière clavier : pas quand le focus est dans un champ de saisie. */
function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.closest('[contenteditable="true"]')) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const input = el as HTMLInputElement;
    const t = (input.type || 'text').toLowerCase();
    if (
      t === 'checkbox' ||
      t === 'radio' ||
      t === 'button' ||
      t === 'submit' ||
      t === 'reset' ||
      t === 'file' ||
      t === 'hidden' ||
      t === 'range' ||
      t === 'color' ||
      t === 'image'
    ) {
      return false;
    }
    return !input.readOnly && !input.disabled;
  }
  return false;
}

function BackspaceNavigationListener() {
  const { goBackWithRegisteredFallback } = useAppNavigation();
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return;
      if (e.defaultPrevented) return;
      if (isEditableTarget(e.target as EventTarget)) return;
      e.preventDefault();
      goBackWithRegisteredFallback();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [goBackWithRegisteredFallback]);
  return null;
}

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
  const returnFallbackRef = useRef('/');

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

  const setReturnFallback = useCallback((href: string) => {
    returnFallbackRef.current = href;
  }, []);

  const goBackWithRegisteredFallback = useCallback(() => {
    goBack(returnFallbackRef.current);
  }, [goBack]);

  const value = useMemo(
    () => ({ goBack, setReturnFallback, goBackWithRegisteredFallback }),
    [goBack, setReturnFallback, goBackWithRegisteredFallback],
  );

  return (
    <NavigationContext.Provider value={value}>
      <BackspaceNavigationListener />
      {children}
    </NavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('NavigationProvider est requis (Layout).');
  return ctx;
}

/**
 * Pages de liste du menu (Exploitation / Finances) : pas de bandeau « Retour ».
 * Le retour clavier (Backspace) utilise le tableau de bord comme secours si l’historique est vide.
 */
export function useRegisterRootSectionFallback() {
  const { setReturnFallback } = useAppNavigation();
  useEffect(() => {
    setReturnFallback('/');
    return () => setReturnFallback('/');
  }, [setReturnFallback]);
}
