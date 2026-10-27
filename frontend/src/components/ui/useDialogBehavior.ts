import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Pile des dialogues ouverts : seul le dernier réagit à Échap / Tab. */
const dialogStack: symbol[] = [];
let scrollLocks = 0;
let previousOverflow = '';

function lockScroll() {
  if (scrollLocks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * Comportement commun des dialogues : Échap ferme, focus piégé (léger), focus restauré,
 * défilement du fond verrouillé. Donner le focus initial via `data-autofocus` sur un enfant.
 */
export function useDialogBehavior(open: boolean, onClose: () => void, containerRef: RefObject<HTMLElement | null>) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const token = Symbol('dialog');
    dialogStack.push(token);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockScroll();

    const container = containerRef.current;
    if (container) {
      const preferred = container.querySelector<HTMLElement>('[data-autofocus]');
      const target = preferred ?? getFocusable(container)[0] ?? container;
      target.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (dialogStack[dialogStack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !containerRef.current) return;
      const items = getFocusable(containerRef.current);
      if (!items.length) {
        e.preventDefault();
        containerRef.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !containerRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !containerRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const idx = dialogStack.indexOf(token);
      if (idx >= 0) dialogStack.splice(idx, 1);
      unlockScroll();
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [open, containerRef]);
}
