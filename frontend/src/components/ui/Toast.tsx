/* eslint-disable react-refresh/only-export-components -- API impérative `toast` + provider dans un seul fichier. */
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './IconButton';
import { cn } from './cn';

export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export type ToastOptions = {
  variant?: ToastVariant;
  /** Durée en ms avant disparition (défaut : 4000, erreurs 6000). `0` = reste affiché. */
  duration?: number;
};

type ToastItemData = { id: number; message: string; variant: ToastVariant; duration: number };

const MAX_VISIBLE = 4;
let nextId = 1;
let emit: ((item: ToastItemData) => void) | null = null;
let remove: ((id: number) => void) | null = null;

/** Affiche une notification. Sans `ToastProvider` monté, l'appel est ignoré. Retourne l'identifiant. */
export function toast(message: string, opts?: ToastOptions): number {
  const variant = opts?.variant ?? 'info';
  const id = nextId++;
  emit?.({ id, message, variant, duration: opts?.duration ?? (variant === 'error' ? 6000 : 4000) });
  return id;
}

/** Ferme une notification avant son terme. */
export function dismissToast(id: number): void {
  remove?.(id);
}

const iconProps = {
  'aria-hidden': true,
  className: 'size-5 shrink-0',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ICONS: Record<ToastVariant, ReactNode> = {
  info: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  ),
  success: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </svg>
  ),
  error: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  ),
  warning: (
    <svg {...iconProps}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4M12 17.2h.01" />
    </svg>
  ),
};

const ACCENT: Record<ToastVariant, string> = {
  info: 'var(--color-brand-600)',
  success: 'var(--status-paid)',
  error: 'var(--status-late)',
  warning: 'var(--status-pending)',
};

function ToastItem({ item, onDismiss }: { item: ToastItemData; onDismiss: (id: number) => void }) {
  useEffect(() => {
    if (item.duration <= 0) return;
    const t = window.setTimeout(() => onDismiss(item.id), item.duration);
    return () => window.clearTimeout(t);
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      style={{ borderLeftColor: ACCENT[item.variant] }}
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[var(--radius-card)] border border-l-4 border-[var(--odoo-border)] bg-[var(--color-surface)] py-3 pl-3 pr-1.5 text-sm text-[var(--color-ink)] shadow-[var(--shadow-lift)] transition duration-[var(--duration-base)] starting:translate-y-2 starting:opacity-0 dark:border-zinc-600',
      )}
    >
      <span style={{ color: ACCENT[item.variant] }} className="mt-0.5">
        {ICONS[item.variant]}
      </span>
      <p className="min-w-0 flex-1 whitespace-pre-line pt-0.5 leading-snug">{item.message}</p>
      <IconButton
        aria-label="Fermer la notification"
        size="sm"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        }
        onClick={() => onDismiss(item.id)}
      />
    </div>
  );
}

/** Fournisseur des notifications : pile en bas au centre, région `aria-live="polite"`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItemData[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    emit = (item) => setItems((prev) => [...prev, item].slice(-MAX_VISIBLE));
    remove = dismiss;
    return () => {
      emit = null;
      remove = null;
    };
  }, [dismiss]);

  return (
    <>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-relevant="additions"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-toast)] flex flex-col items-center gap-2 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {items.map((item) => (
            <ToastItem key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
