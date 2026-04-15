import {
  Children,
  type ChangeEvent,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { SelectHTMLAttributes } from 'react';
import { useFixedPanelPosition } from '@/hooks/useFixedPanelPosition';
import { scrollIntoContainedView } from '@/lib/domScroll';

/** Même famille visuelle que SearchableSelect (périmètre Paiements) + listes natives de secours */
const selectNativeFallbackClass =
  'w-full min-h-[2.5rem] rounded-xl border border-slate-200/95 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm focus:outline-none focus:shadow-md focus:ring-2 focus:ring-brand-500/25 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-50';

const triggerClass =
  'w-full min-h-[2.5rem] flex items-center rounded-xl border border-slate-200/95 bg-white py-2 pl-3 pr-11 text-left text-xs font-medium text-slate-900 shadow-sm transition-[box-shadow] duration-150 focus:outline-none focus:shadow-md focus:ring-2 focus:ring-brand-500/25 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-50';

const panelShellClass =
  'overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_12px_40px_-8px_rgb(15_23_42/0.28),0_4px_16px_-4px_rgb(15_23_42/0.12)] ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-900 dark:shadow-[0_16px_48px_-8px_rgb(0_0_0/0.55)] dark:ring-white/[0.06]';

const panelHeaderClass =
  'flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2 dark:border-slate-700 dark:from-slate-800/80 dark:to-slate-900';

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement(node) && node.props && typeof node.props === 'object' && 'children' in node.props) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

type Collected = { value: string; label: string; disabled?: boolean };

function collectOptions(children: ReactNode): Collected[] {
  const out: Collected[] = [];
  const walk = (n: ReactNode) => {
    Children.forEach(n, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === 'option') {
        const p = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
        out.push({
          value: String(p.value ?? ''),
          label: nodeText(p.children),
          disabled: !!p.disabled,
        });
      } else if ((child.props as { children?: ReactNode }).children) {
        walk((child.props as { children: ReactNode }).children);
      }
    });
  };
  walk(children);
  return out;
}

export const Select = forwardRef<HTMLButtonElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  props,
  ref,
) {
  const {
    className = '',
    children,
    value,
    onChange,
    disabled,
    required,
    id,
    name,
    autoFocus,
    form,
    multiple,
    'aria-invalid': ariaInvalid,
    ...rest
  } = props;

  const options = useMemo(() => collectOptions(children), [children]);

  if (multiple) {
    return <select className={`${selectNativeFallbackClass} ${className}`} {...props} />;
  }

  if (options.length === 0) {
    return <select className={`${selectNativeFallbackClass} ${className}`} {...props} />;
  }

  const strValue = value === undefined || value === null ? '' : String(value);

  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const selectedLabel = useMemo(() => {
    const o = options.find((x) => x.value === strValue);
    return o?.label ?? '';
  }, [options, strValue]);

  const selectedIdx = useMemo(() => {
    const i = options.findIndex((x) => x.value === strValue);
    return i >= 0 ? i : 0;
  }, [options, strValue]);

  const panelBox = useFixedPanelPosition(wrapRef, open && !disabled);

  useEffect(() => {
    if (open) setActiveIdx(selectedIdx);
  }, [open, selectedIdx]);

  useEffect(() => {
    setActiveIdx((i) => (options.length === 0 ? 0 : Math.max(0, Math.min(i, options.length - 1))));
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    const ul = listRef.current;
    const el = rowRefs.current[activeIdx];
    if (ul && el) scrollIntoContainedView(ul, el);
  }, [activeIdx, open, options.length]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const fireChange = useCallback(
    (next: string) => {
      if (!onChange) return;
      const synthetic = {
        target: { value: next },
        currentTarget: { value: next },
      } as unknown as ChangeEvent<HTMLSelectElement>;
      onChange(synthetic);
    },
    [onChange],
  );

  const pick = useCallback(
    (next: string) => {
      fireChange(next);
      setOpen(false);
    },
    [fireChange],
  );

  const nextEnabled = useCallback(
    (from: number, dir: 1 | -1) => {
      let j = from + dir;
      while (j >= 0 && j < options.length && options[j]?.disabled) j += dir;
      return j >= 0 && j < options.length ? j : from;
    },
    [options],
  );

  const listId = id ? `${id}-listbox` : undefined;

  function onBtnKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => nextEnabled(i, 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => nextEnabled(i, -1));
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = options[activeIdx];
      if (o && !o.disabled) pick(o.value);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveIdx(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveIdx(Math.max(0, options.length - 1));
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <select
        name={name}
        value={strValue}
        onChange={onChange}
        required={required}
        disabled={disabled}
        form={form}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        {...rest}
      >
        {children}
      </select>
      <div className="relative">
        <button
          type="button"
          id={id}
          ref={ref}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-required={required}
          aria-invalid={ariaInvalid}
          onKeyDown={onBtnKeyDown}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`${triggerClass} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${open ? 'ring-2 ring-brand-500/30' : ''} ${className}`}
        >
          <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        </button>
        <span
          className="pointer-events-none absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-slate-500 dark:text-slate-400"
          aria-hidden
        >
          <svg
            className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {open && !disabled && panelBox
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[10000] origin-top"
              style={{ top: panelBox.top, left: panelBox.left, width: panelBox.width }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className={panelShellClass}>
                <div className={panelHeaderClass}>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{options.length}</span>
                    {' proposition'}
                    {options.length !== 1 ? 's' : ''}
                  </p>
                  <span className="hidden text-[10px] text-slate-400 sm:inline dark:text-slate-500">
                    Flèches · Entrée · Échap.
                  </span>
                </div>
                <ul
                  ref={listRef}
                  id={listId}
                  role="listbox"
                  className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain py-1.5"
                >
                {options.map((opt, idx) => {
                  const selected = opt.value === strValue;
                  const highlighted = idx === activeIdx;
                  return (
                    <li
                      key={`${opt.value}-${idx}`}
                      ref={(el) => {
                        rowRefs.current[idx] = el;
                      }}
                      role="option"
                      aria-selected={selected}
                      id={id ? `${id}-opt-${idx}` : undefined}
                      className={`relative mx-1.5 cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-100 ${
                        opt.disabled
                          ? 'cursor-not-allowed opacity-50'
                          : highlighted
                            ? 'bg-brand-600 text-white shadow-md ring-1 ring-brand-700/20 dark:bg-brand-500 dark:ring-white/10'
                            : selected
                              ? 'bg-brand-50/95 font-semibold text-brand-900 dark:bg-brand-950/55 dark:text-brand-100'
                              : 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/90'
                      } ${!highlighted && !selected && !opt.disabled ? 'border border-transparent' : ''}`}
                      onMouseEnter={() => !opt.disabled && setActiveIdx(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (!opt.disabled) pick(opt.value);
                      }}
                    >
                      {!highlighted && selected && !opt.disabled ? (
                        <span
                          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-brand-500 dark:bg-brand-400"
                          aria-hidden
                        />
                      ) : null}
                      <span className={`block pl-0.5 leading-snug ${highlighted ? 'text-white' : ''}`}>{opt.label}</span>
                    </li>
                  );
                })}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
});
