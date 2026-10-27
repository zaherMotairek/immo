/* eslint-disable react-refresh/only-export-components -- API impérative `confirmDialog` + provider dans un seul fichier. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

export type ConfirmTone = 'danger' | 'default';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

export type ConfirmDialogProps = ConfirmOptions & {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Dialogue de confirmation (présentation). Le bouton d'annulation reçoit le focus initial. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">{message}</p>
    </Modal>
  );
}

type Pending = { opts: ConfirmOptions; resolve: (value: boolean) => void };

let enqueue: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

/**
 * Confirmation impérative : `if (await confirmDialog({...})) { ... }`.
 * Sans `ConfirmProvider` monté, retombe sur `window.confirm` (comportement historique).
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (enqueue) return enqueue(opts);
  return Promise.resolve(typeof window !== 'undefined' ? window.confirm(opts.message) : false);
}

/** Fournisseur de l'API `confirmDialog` — à monter une seule fois, près de la racine. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Pending | null>(null);
  const queueRef = useRef<Pending[]>([]);
  const currentRef = useRef<Pending | null>(null);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    currentRef.current = next;
    setCurrent(next);
  }, []);

  useEffect(() => {
    enqueue = (opts) =>
      new Promise<boolean>((resolve) => {
        const item: Pending = { opts, resolve };
        if (currentRef.current) {
          queueRef.current.push(item);
        } else {
          currentRef.current = item;
          setCurrent(item);
        }
      });
    return () => {
      enqueue = null;
      // Démontage : toute confirmation en attente est refusée.
      currentRef.current?.resolve(false);
      queueRef.current.forEach((p) => p.resolve(false));
      currentRef.current = null;
      queueRef.current = [];
    };
  }, []);

  const settle = useCallback(
    (value: boolean) => {
      currentRef.current?.resolve(value);
      showNext();
    },
    [showNext],
  );

  return (
    <>
      {children}
      <ConfirmDialog
        open={current !== null}
        title={current?.opts.title ?? ''}
        message={current?.opts.message ?? ''}
        confirmLabel={current?.opts.confirmLabel}
        cancelLabel={current?.opts.cancelLabel}
        tone={current?.opts.tone}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </>
  );
}
