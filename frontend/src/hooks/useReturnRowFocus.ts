import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { consumeReturnFocusForPath, peekReturnFocusForPath } from '@/lib/navigation';

/**
 * Au retour sur une liste (après SmartLink returnFocusId), fait défiler jusqu’à la ligne
 * et applique une courte surbrillance. Utilise peek + réessais pour éviter de perdre la clé
 * (Strict Mode, rendu asynchrone du tableau).
 */
export function useReturnRowFocus(options: { rowIdPrefix: string; ready: boolean }) {
  const { rowIdPrefix, ready } = options;
  const location = useLocation();
  const [flashRowId, setFlashRowId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!ready) return;
    const path = location.pathname + location.search;
    const peeked = peekReturnFocusForPath(path);
    if (!peeked) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 48;
    let flashTimer: number | undefined;

    const finishFlash = (id: string) => {
      setFlashRowId(id);
      flashTimer = window.setTimeout(() => setFlashRowId(null), 2600);
    };

    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(`${rowIdPrefix}${peeked}`);
      if (el) {
        consumeReturnFocusForPath(path);
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        finishFlash(peeked);
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        consumeReturnFocusForPath(path);
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (flashTimer !== undefined) window.clearTimeout(flashTimer);
    };
  }, [location.pathname, location.search, location.key, ready, rowIdPrefix]);

  return flashRowId;
}
