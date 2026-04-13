import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Input } from '@/components/ui';

export type SearchableSelectOption = { id: string; label: string };

function fold(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Plage à surligner quand la requête correspond (accents tolérés). */
function findHighlightRange(label: string, q: string): [number, number] | null {
  const fq = fold(q.trim());
  if (!fq || fq.length === 0) return null;
  for (let i = 0; i < label.length; i++) {
    for (let j = i + 1; j <= label.length; j++) {
      if (fold(label.slice(i, j)) === fq) return [i, j];
    }
  }
  return null;
}

function HighlightLabel({ label, query }: { label: string; query: string }) {
  const range = findHighlightRange(label, query);
  if (!range) return <>{label}</>;
  const [a, b] = range;
  return (
    <>
      {label.slice(0, a)}
      <mark className="rounded-sm bg-amber-200/95 px-0.5 font-semibold text-amber-950 ring-1 ring-amber-300/60 dark:bg-amber-500/35 dark:text-amber-50 dark:ring-amber-400/40">
        {label.slice(a, b)}
      </mark>
      {label.slice(b)}
    </>
  );
}

type Row =
  | { kind: 'empty'; key: string }
  | { kind: 'option'; key: string; id: string; label: string };

type Props = {
  id?: string;
  'aria-label'?: string;
  value: string;
  onChange: (id: string) => void;
  options: SearchableSelectOption[];
  emptyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
};

export function SearchableSelect({
  id,
  'aria-label': ariaLabel,
  value,
  onChange,
  options,
  emptyLabel,
  placeholder = 'Rechercher dans la liste…',
  disabled = false,
  className = '',
  inputClassName = '',
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  /** Pour masquer le placeholder dès le focus (le texte « — Choisir… » ne doit pas rester affiché comme valeur). */
  const [fieldFocused, setFieldFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listId = id ? `${id}-listbox` : undefined;

  /** Libellé du choix uniquement : jamais emptyLabel dans le champ (celui-ci reste un placeholder). */
  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return options.find((o) => o.id === value)?.label ?? '';
  }, [value, options]);

  useEffect(() => {
    setText(selectedLabel);
  }, [selectedLabel]);

  const placeholderShown = useMemo(() => {
    if (value || text.trim()) return undefined;
    if (fieldFocused) return undefined;
    return emptyLabel ?? placeholder;
  }, [value, text, fieldFocused, emptyLabel, placeholder]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = fold(text.trim());
    if (!q) return options;
    return options.filter((o) => fold(o.label).includes(q));
  }, [options, text]);

  const rows: Row[] = useMemo(() => {
    const q = fold(text.trim());
    const r: Row[] = [];
    const showEmptyRow = emptyLabel !== undefined && (!q || fold(emptyLabel).includes(q));
    if (showEmptyRow) r.push({ kind: 'empty', key: '__empty' });
    for (const o of filtered) {
      r.push({ kind: 'option', key: o.id, id: o.id, label: o.label });
    }
    return r;
  }, [emptyLabel, filtered, text]);

  useEffect(() => {
    setActiveIdx(0);
  }, [text, open, rows.length]);

  useEffect(() => {
    setActiveIdx((i) => (rows.length === 0 ? 0 : Math.max(0, Math.min(i, rows.length - 1))));
  }, [rows.length]);

  useEffect(() => {
    if (!open) return;
    const el = rowRefs.current[activeIdx];
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIdx, open]);

  const inputPad = compact ? 'min-h-[2.5rem] py-2 pl-3 pr-11 text-xs' : 'min-h-[2.75rem] py-2.5 pl-3.5 pr-11';
  const queryForHighlight = text.trim();

  const pick = useCallback(
    (idStr: string) => {
      onChange(idStr);
      const label = idStr ? options.find((o) => o.id === idStr)?.label ?? '' : '';
      setText(label);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange, options],
  );

  const selectActive = useCallback(() => {
    const row = rows[activeIdx];
    if (!row) return;
    if (row.kind === 'empty') pick('');
    else pick(row.id);
  }, [rows, activeIdx, pick]);

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(rows.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      selectActive();
      return;
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
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
      setActiveIdx(Math.max(0, rows.length - 1));
    }
  }

  function renderLabel(label: string): ReactNode {
    if (!queryForHighlight) return label;
    return <HighlightLabel label={label} query={queryForHighlight} />;
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && rows[activeIdx]
              ? id
                ? `${id}-opt-${activeIdx}`
                : undefined
              : undefined
          }
          aria-label={ariaLabel}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholderShown}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFieldFocused(true);
            if (!disabled) {
              setOpen(true);
            }
          }}
          onClick={() => !disabled && setOpen(true)}
          onKeyDown={onInputKeyDown}
          onBlur={() => {
            window.setTimeout(() => {
              setFieldFocused(false);
              setOpen(false);
              setText(value ? (options.find((o) => o.id === value)?.label ?? '') : '');
            }, 160);
          }}
          className={`${inputPad} rounded-xl border-slate-200/95 pr-11 shadow-sm transition-[box-shadow] duration-150 focus:shadow-md focus:ring-2 focus:ring-brand-500/25 dark:border-slate-600 ${open ? 'ring-2 ring-brand-500/30' : ''} ${inputClassName}`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            if (disabled) return;
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
        </button>
      </div>

      {open && !disabled ? (
        <div className="absolute z-[100] mt-2 w-full origin-top">
          <div className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-[0_12px_40px_-8px_rgb(15_23_42/0.28),0_4px_16px_-4px_rgb(15_23_42/0.12)] ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-900 dark:shadow-[0_16px_48px_-8px_rgb(0_0_0/0.55)] dark:ring-white/[0.06]">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2 dark:border-slate-700 dark:from-slate-800/80 dark:to-slate-900">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                {fold(text.trim()) ? (
                  <>
                    <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{filtered.length}</span>
                    {' résultat'}
                    {filtered.length !== 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{options.length}</span>
                    {' proposition'}
                    {options.length !== 1 ? 's' : ''}
                  </>
                )}
              </p>
              <span className="hidden text-[10px] text-slate-400 sm:inline dark:text-slate-500">
                Flèches · Entrée · Échap.
              </span>
            </div>

            <ul id={listId} role="listbox" className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain py-1.5">
              {rows.length === 0 ? (
                <li
                  role="status"
                  className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  <svg className="size-10 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                  </svg>
                  <span>
                    Aucune proposition ne correspond.
                    <br />
                    <span className="text-xs text-slate-400 dark:text-slate-500">Affinez ou effacez la recherche.</span>
                  </span>
                </li>
              ) : (
                rows.map((row, idx) => {
                  const isEmpty = row.kind === 'empty';
                  const optId = isEmpty ? '' : row.id;
                  const lab = isEmpty ? (emptyLabel ?? '') : row.label;
                  const selected = isEmpty ? value === '' : value === optId;
                  const highlighted = idx === activeIdx;

                  return (
                    <li
                      key={row.key}
                      ref={(el) => {
                        rowRefs.current[idx] = el;
                      }}
                      id={id ? `${id}-opt-${idx}` : undefined}
                      role="option"
                      aria-selected={selected}
                      className={`relative mx-1.5 cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-100 ${
                        highlighted
                          ? 'bg-brand-600 text-white shadow-md ring-1 ring-brand-700/20 dark:bg-brand-500 dark:ring-white/10'
                          : selected
                            ? 'bg-brand-50/95 font-semibold text-brand-900 dark:bg-brand-950/55 dark:text-brand-100'
                            : 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/90'
                      } ${!highlighted && !selected ? 'border border-transparent' : ''}`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (isEmpty) pick('');
                        else pick(optId);
                      }}
                    >
                      {!highlighted && selected ? (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-brand-500 dark:bg-brand-400" aria-hidden />
                      ) : null}
                      <span className={`block pl-0.5 leading-snug ${highlighted ? 'text-white' : ''}`}>
                        {isEmpty ? lab : highlighted ? lab : renderLabel(lab)}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
