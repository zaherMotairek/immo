import { type CSSProperties, type RefObject, useLayoutEffect, useState } from 'react';

export type FixedPanelBox = {
  left: number;
  width: number;
  /** Hauteur max suggérée pour le panneau (viewport-aware). */
  maxHeight?: number;
  /** Panneau sous l’ancre. */
  top?: number;
  /** Panneau au-dessus de l’ancre (bas du panneau aligné sur le champ). */
  bottom?: number;
};

/** Style `position: fixed` pour un panneau ancré (top ou bottom, jamais les deux). */
export function fixedPanelStyle(box: FixedPanelBox): CSSProperties {
  const style: CSSProperties = { left: box.left, width: box.width };
  if (box.top !== undefined) style.top = box.top;
  if (box.bottom !== undefined) style.bottom = box.bottom;
  return style;
}

/**
 * Position d’un panneau en `position: fixed` sous (ou au-dessus de) une ancre,
 * recalculée au scroll (capture) et au resize.
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

      if (openUp) {
        setPanelBox({
          left,
          width: maxW,
          maxHeight,
          bottom: vh - r.top + margin,
        });
      } else {
        setPanelBox({
          left,
          width: maxW,
          maxHeight,
          top: r.bottom + margin,
        });
      }
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
