import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './IconButton';
import { cn } from './cn';
import { useDialogBehavior } from './useDialogBehavior';

export type ModalSize = 'sm' | 'md' | 'lg';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Ferme au clic sur le fond (défaut : oui). */
  closeOnBackdrop?: boolean;
  className?: string;
};

const sizeClass: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/** Boîte de dialogue modale : Échap / clic fond ferment, focus piégé, focus restauré. */
export function Modal({ open, onClose, title, children, footer, size = 'md', closeOnBackdrop = true, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogBehavior(open, onClose, panelRef);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px] transition-opacity duration-[var(--duration-base)] starting:opacity-0"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-[var(--radius-sheet)] border border-[var(--odoo-border)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-lift)] outline-none transition duration-[var(--duration-base)] starting:translate-y-3 starting:opacity-0 dark:border-zinc-600',
          sizeClass[size],
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--odoo-border)] px-4 py-3 sm:px-5">
          <h2 id={titleId} className="min-w-0 text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <IconButton aria-label="Fermer" icon={<CloseIcon />} size="sm" onClick={onClose} className="-mr-1.5 -mt-0.5" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
