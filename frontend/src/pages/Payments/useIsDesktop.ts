import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 768px)';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/**
 * `true` à partir de `md` (768 px). Sert à ne monter qu'une seule vue (tableau OU liste de cartes) :
 * les ids `payment-<id>` restent uniques pour le scroll de retour et la surbrillance.
 */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
