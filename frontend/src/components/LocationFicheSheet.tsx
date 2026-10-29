import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { OdooSheetHeader } from '@/components/OdooKit';

const SHEET_TRANSITION_MS = 480;

type Props = {
  /** Si fourni, affiche ce contenu à la place de l’Outlet (composition depuis App). */
  children?: ReactNode;
};

/**
 * Fenêtre centrée pour la fiche location (zoom scale + fond assombri).
 * Remplace l’ancien panneau qui glissait depuis la droite.
 */
export function LocationFicheSheet({ children }: Props) {
  const navigate = useNavigate();
  const [sheetEntered, setSheetEntered] = useState(false);
  const closeAnimLock = useRef(false);

  const closeAnimated = useCallback(() => {
    if (closeAnimLock.current) return;
    closeAnimLock.current = true;
    setSheetEntered(false);
    window.setTimeout(() => {
      navigate(-1);
      closeAnimLock.current = false;
    }, SHEET_TRANSITION_MS);
  }, [navigate]);

  useEffect(() => {
    setSheetEntered(false);
    const tid = window.setTimeout(() => setSheetEntered(true), 32);
    return () => window.clearTimeout(tid);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      closeAnimated();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeAnimated]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[78] flex items-center justify-center p-3 sm:px-4 sm:py-5 lg:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-fiche-sheet-title"
      data-escape-modal="true"
    >
      <button
        type="button"
        className={`payment-detail-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-[480ms] ease-out ${
          sheetEntered ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Fermer la fiche location"
        onClick={closeAnimated}
      />
      <div
        className={`payment-detail-sheet relative z-10 flex max-h-[min(94dvh,58rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-sheet)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] shadow-[var(--shadow-lift)] transition-[transform,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-700 dark:bg-zinc-950 sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl ${
          sheetEntered ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-0'
        }`}
      >
        <OdooSheetHeader
          kicker="Fiche location"
          titleId="location-fiche-sheet-title"
          title="Détail du bail"
          subtitle="Fenêtre sur la page"
          onClose={closeAnimated}
        />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
          {children ?? <Outlet />}
        </div>
      </div>
    </div>
  );
}
