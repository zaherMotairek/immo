import { useEffect, useRef } from 'react';

/** Recherche globale ou modale ouverte : ne pas annuler la saisie en cours de page. */
export function shouldDeferEscapeCancel(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.querySelector('[data-global-search-open="true"]')) return true;
  if (document.querySelector('[data-escape-modal="true"]')) return true;
  return false;
}

/**
 * Échap : annule les modifications (équivalent à « Annuler »).
 * Ne s’exécute pas si la recherche globale ou une modale `data-escape-modal` est active.
 */
export function useEscapeCancel(enabled: boolean, onCancel: () => void) {
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (shouldDeferEscapeCancel()) return;
      e.preventDefault();
      onCancelRef.current();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [enabled]);
}
