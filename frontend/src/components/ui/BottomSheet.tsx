import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './IconButton';
import { CloseIcon } from './Modal';
import { cn } from './cn';
import { useDialogBehavior } from './useDialogBehavior';

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

/** Feuille montante (mobile-first) : poignée, safe-area, Échap / clic fond ferment. */
export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogBehavior(open, onClose, panelRef);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-black/45 backdrop-blur-[2px] transition-opacity duration-[var(--duration-base)] starting:opacity-0"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[var(--radius-sheet)] border border-b-0 border-[var(--odoo-border)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-lift)] outline-none transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] starting:translate-y-full sm:max-w-lg dark:border-zinc-600',
          className,
        )}
      >
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--odoo-border-strong)]" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-2">
          <h2 id={titleId} className="min-w-0 text-base font-semibold tracking-tight">
            {title}
          </h2>
          <IconButton aria-label="Fermer" icon={<CloseIcon />} size="sm" onClick={onClose} className="-mr-1.5" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
