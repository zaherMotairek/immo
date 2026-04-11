import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SCROLL_STORAGE_PREFIX } from '@/lib/navigation';

/** Restaure la position de scroll sauvegardée avant d’ouvrir une fiche (liste → détail → retour). */
export function ScrollRestoration() {
  const location = useLocation();
  useLayoutEffect(() => {
    const path = location.pathname + location.search;
    const key = SCROLL_STORAGE_PREFIX + path;
    const y = sessionStorage.getItem(key);
    if (y == null) return;
    sessionStorage.removeItem(key);
    const n = Number(y);
    if (!Number.isFinite(n)) return;
    requestAnimationFrame(() => {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo(0, Math.min(n, max));
    });
  }, [location.pathname, location.search, location.key]);
  return null;
}
