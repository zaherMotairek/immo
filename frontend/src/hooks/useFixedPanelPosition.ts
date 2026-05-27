import { type RefObject, useLayoutEffect, useState } from 'react';

export type FixedPanelBox = {
  top: number;
  left: number;
  width: number;
  /** Hauteur max suggérée pour le panneau (viewport-aware). */
  maxHeight?: number;
};

/**
 * Position d’un panneau en `position: fixed` sous une ancre (getBoundingClientRect),
 * recalculée au scroll (capture) et au resize — même logique que SearchableSelect.
 */
export function useFixedPanelPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
): FixedPanelBox | null {
  const [panelBox, setPanelBox] = useState<FixedPanelBox | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPanelBox(null);
      return;
    }
    function update() {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      const margin = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxW = Math.min(r.width, vw - 16);
      let left = r.left;
      if (left + maxW > vw - 8) left = Math.max(8, vw - maxW - 8);
      if (left < 8) left = 8;
      const spaceBelow = Math.max(0, vh - r.bottom - margin - 8);
      const spaceAbove = Math.max(0, r.top - margin - 8);
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
      const available = openUp ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(140, Math.min(available, 360));
      const top = openUp ? Math.max(8, r.top - margin - maxHeight) : r.bottom + margin;
      setPanelBox({ top, left, width: maxW, maxHeight });
    }
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef]);

  return panelBox;
}
