import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { OdooSheetHeader } from '@/components/OdooKit';

const TRANSITION_MS = 480;

export type AddZoomModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  subtitle?: string;
  children: ReactNode;
  /** Largeur max desktop (défaut : bien / formulaires larges). */
  size?: 'md' | 'lg' | 'xl';
  titleId?: string;
};

const sizeClass = {
  md: 'max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl',
  lg: 'max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl',
  xl: 'max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl',
} as const;

/**
 * Fenêtre centrée (zoom) pour les formulaires « Ajouter… ».
 * Même animation que les fiches location / paiement.
 */
export function AddZoomModal({
  open,
  onClose,
  title,
  kicker = 'Nouveau',
  subtitle,
  children,
  size = 'lg',
  titleId = 'add-zoom-modal-title',
}: AddZoomModalProps) {
  const [entered, setEntered] = useState(false);
  const closeLock = useRef(false);

  const closeAnimated = useCallback(() => {
    if (closeLock.current) return;
    closeLock.current = true;
    setEntered(false);
    window.setTimeout(() => {
      onClose();
      closeLock.current = false;
    }, TRANSITION_MS);
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    setEntered(false);
    const tid = window.setTimeout(() => setEntered(true), 32);
    return () => window.clearTimeout(tid);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAnimated();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeAnimated]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[88] flex items-center justify-center p-3 sm:px-4 sm:py-5 lg:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-escape-modal="true"
    >
      <button
        type="button"
        className={`payment-detail-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-[480ms] ease-out ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Fermer"
        onClick={closeAnimated}
      />
      <div
        className={`payment-detail-sheet relative z-10 flex max-h-[min(94dvh,58rem)] w-full flex-col overflow-hidden rounded-[var(--radius-sheet)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] shadow-[var(--shadow-lift)] transition-[transform,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-700 dark:bg-zinc-950 ${sizeClass[size]} ${
          entered ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-0'
        }`}
      >
        <OdooSheetHeader
          kicker={kicker}
          titleId={titleId}
          title={title}
          subtitle={subtitle}
          onClose={closeAnimated}
        />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}
