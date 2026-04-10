import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { Input } from './ui';

type SearchResponse = {
  buildings: Array<{ id: string; name: string; city: string; commune: string }>;
  tenants: Array<{ id: string; firstName: string; lastName: string; email: string | null; phone: string | null }>;
  units: Array<{
    id: string;
    label: string;
    kind: string;
    buildingId: string;
    building: { name: string; city: string };
  }>;
  leases: Array<{
    id: string;
    active: boolean;
    tenant: { firstName: string; lastName: string };
    unit: { label: string; building: { name: string; city: string } };
  }>;
  charges: Array<{
    id: string;
    label: string;
    amount: unknown;
    periodYear: number;
    periodMonth: number | null;
    building: { name: string };
  }>;
  payments: Array<{
    id: string;
    periodYear: number;
    periodMonth: number;
    status: string;
    amountDue: unknown;
    lease: {
      id: string;
      tenant: { firstName: string; lastName: string };
      unit: { label: string; building: { name: string; city: string } };
    };
  }>;
};

type SearchItem = {
  key: string;
  href: string;
  section: string;
  sectionVariant: 'building' | 'tenant' | 'unit' | 'lease' | 'charge' | 'payment';
  primary: string;
  secondary: string;
};

const RECENT_KEY = 'immopilot-search-recent';
const RECENT_MAX = 6;
const DEBOUNCE_MS = 160;

function readRecent(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function writeRecent(entries: string[]) {
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(entries.slice(0, RECENT_MAX)));
  } catch {
    /* ignore */
  }
}

function pushRecentQuery(q: string) {
  const t = q.trim();
  if (t.length < 2) return;
  const prev = readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase());
  writeRecent([t, ...prev].slice(0, RECENT_MAX));
}

function paymentStatusFr(status: string) {
  switch (status) {
    case 'PAID':
      return 'Payé';
    case 'LATE':
      return 'En retard';
    case 'PENDING':
      return 'À venir';
    case 'CANCELLED':
      return 'Annulé';
    default:
      return status;
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({ text, needle }: { text: string; needle: string }) {
  const n = needle.trim();
  if (!n) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(n)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === n.toLowerCase() ? (
          <mark
            key={i}
            className="rounded px-0.5 font-medium text-inherit bg-amber-200/90 text-slate-900 dark:bg-brand-500/35 dark:text-brand-50"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const SHORTCUT_HINT =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl+K';

const SECTION_STYLES: Record<SearchItem['sectionVariant'], { bar: string; icon: ReactNode }> = {
  building: {
    bar: 'bg-sky-500',
    icon: (
      <svg className="size-4 shrink-0 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9v.01M9 12v.01M9 15v.01M12 12v.01M12 15v.01M15 12v.01M15 15v.01" />
      </svg>
    ),
  },
  tenant: {
    bar: 'bg-violet-500',
    icon: (
      <svg className="size-4 shrink-0 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  unit: {
    bar: 'bg-teal-500',
    icon: (
      <svg className="size-4 shrink-0 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  lease: {
    bar: 'bg-emerald-500',
    icon: (
      <svg className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  charge: {
    bar: 'bg-amber-500',
    icon: (
      <svg className="size-4 shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  payment: {
    bar: 'bg-brand-500',
    icon: (
      <svg className="size-4 shrink-0 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 10h20" strokeLinecap="round" />
      </svg>
    ),
  },
};

function SearchIcon() {
  return (
    <svg className="size-5 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export function GlobalSearchBar() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useRef(`search-results-${Math.random().toString(36).slice(2, 9)}`).current;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), DEBOUNCE_MS);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounced.length < 2) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);
    api<SearchResponse>(`/search?q=${encodeURIComponent(debounced)}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError('Recherche indisponible. Vérifiez la connexion ou l’API.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const items = useMemo((): SearchItem[] => {
    if (!data) return [];
    const out: SearchItem[] = [];
    for (const b of data.buildings) {
      out.push({
        key: `b-${b.id}`,
        href: `/biens/${b.id}`,
        section: 'Biens',
        sectionVariant: 'building',
        primary: b.name,
        secondary: `${b.commune}, ${b.city}`,
      });
    }
    for (const t of data.tenants) {
      out.push({
        key: `t-${t.id}`,
        href: `/locataires?edit=${t.id}`,
        section: 'Locataires',
        sectionVariant: 'tenant',
        primary: `${t.firstName} ${t.lastName}`.trim(),
        secondary: [t.phone, t.email].filter(Boolean).join(' · ') || '—',
      });
    }
    for (const u of data.units) {
      out.push({
        key: `u-${u.id}`,
        href: `/biens/${u.buildingId}`,
        section: 'Unités',
        sectionVariant: 'unit',
        primary: `Unité ${u.label} · ${unitKindLabel(u.kind)}`,
        secondary: `${u.building.name}, ${u.building.city}`,
      });
    }
    for (const l of data.leases) {
      out.push({
        key: `l-${l.id}`,
        href: `/locations/${l.id}`,
        section: 'Locations (baux)',
        sectionVariant: 'lease',
        primary: `${l.tenant.firstName} ${l.tenant.lastName}${!l.active ? ' (inactif)' : ''}`,
        secondary: `${l.unit.building.name} — ${l.unit.label}`,
      });
    }
    for (const c of data.charges) {
      out.push({
        key: `c-${c.id}`,
        href: `/charges?year=${c.periodYear}&focus=${c.id}`,
        section: 'Charges',
        sectionVariant: 'charge',
        primary: c.label,
        secondary: `${c.building.name} · ${fcfa(Number(c.amount))} · ${c.periodYear}${c.periodMonth != null ? ` / ${c.periodMonth}` : ''}`,
      });
    }
    for (const p of data.payments) {
      const { tenant, unit } = p.lease;
      out.push({
        key: `p-${p.id}`,
        href: `/paiements?year=${p.periodYear}&month=${p.periodMonth}&focus=${p.id}`,
        section: 'Paiements',
        sectionVariant: 'payment',
        primary: `${tenant.firstName} ${tenant.lastName} · ${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`,
        secondary: `${unit.building.name} — ${unit.label} · ${paymentStatusFr(p.status)} · ${fcfa(Number(p.amountDue))}`,
      });
    }
    return out;
  }, [data]);

  useEffect(() => {
    setActiveIdx(0);
  }, [debounced, items.length]);

  useEffect(() => {
    if (!open || items.length === 0) return;
    const el = document.querySelector<HTMLElement>(`[data-search-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open, items.length]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const focusSearch = useCallback(() => {
    const el = inputRef.current;
    el?.focus();
    setOpen(true);
    requestAnimationFrame(() => {
      el?.select();
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        const t = e.target as HTMLElement;
        const tag = t.tagName;
        if ((tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') && t.id !== 'global-search') return;
        e.preventDefault();
        focusSearch();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focusSearch, open]);

  const go = useCallback(
    (to: string, fromQuery?: string) => {
      if (fromQuery && fromQuery.trim().length >= 2) pushRecentQuery(fromQuery);
      setRecent(readRecent());
      setOpen(false);
      setQuery('');
      setData(null);
      setError(null);
      navigate(to);
    },
    [navigate],
  );

  const applyRecent = useCallback((r: string) => {
    setQuery(r);
    setOpen(true);
    inputRef.current?.focus();
  }, []);

  const q = query.trim();
  const showPanel = open && q.length > 0;
  const showRecentPanel = open && q.length === 0 && recent.length > 0;
  const showHint = showPanel && q.length === 1;
  const showResultsBlock = showPanel && q.length >= 2;
  const total = items.length;
  const needle = debounced;
  const listKeyboardActive = showResultsBlock && !loading && total > 0;

  return (
    <div ref={wrapRef} className="relative z-50">
      <label className="sr-only" htmlFor="global-search">
        Recherche dans tout le programme ({SHORTCUT_HINT})
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2">
          <SearchIcon />
        </span>
        <Input
          ref={inputRef}
          id="global-search"
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={`Rechercher : bien, locataire, loyer… (${SHORTCUT_HINT})`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setRecent(readRecent());
          }}
          onKeyDown={(e) => {
            if (listKeyboardActive) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((i) => Math.min(items.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((i) => Math.max(0, i - 1));
              } else if (e.key === 'Home') {
                e.preventDefault();
                setActiveIdx(0);
              } else if (e.key === 'End') {
                e.preventDefault();
                setActiveIdx(items.length - 1);
              } else if (e.key === 'Enter') {
                const item = items[activeIdx];
                if (item) {
                  e.preventDefault();
                  go(item.href, debounced);
                }
              }
            }
          }}
          className="w-full rounded-xl border-slate-200/95 bg-white py-2.5 pl-10 pr-[4.5rem] shadow-sm dark:border-slate-600 dark:bg-slate-800/95"
        />
        {!loading && (
          <kbd
            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:inline"
            aria-hidden
          >
            {SHORTCUT_HINT}
          </kbd>
        )}
        {loading && (
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span
              className="inline-block size-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-slate-600"
              aria-hidden
            />
            <span className="hidden sm:inline">Recherche…</span>
          </span>
        )}
      </div>

      {showRecentPanel && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200/90 bg-slate-50/98 py-2 text-sm shadow-xl ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-800 dark:ring-white/10"
          id={listId}
          role="listbox"
          aria-label="Recherches récentes"
        >
          <p className="border-b border-slate-100 px-4 pb-2 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:text-slate-400">
            Recherches récentes
          </p>
          <ul className="max-h-48 overflow-auto py-1">
            {recent.map((r) => (
              <li key={r}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-800 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-700/60"
                  onClick={() => applyRecent(r)}
                >
                  <svg className="size-4 shrink-0 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" />
                    <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="min-w-0 truncate">{r}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showHint && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200/90 bg-slate-50/98 px-4 py-3 text-sm text-slate-700 shadow-xl ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Encore une lettre</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            La recherche démarre à <strong>2 caractères</strong> (noms de biens, locataires, villes, montants…).
          </p>
        </div>
      )}

      {showResultsBlock && loading && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200/90 bg-slate-50/98 p-4 text-sm text-slate-700 shadow-xl ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10">
          <div className="flex items-center gap-3">
            <span className="inline-block size-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600 dark:border-slate-600" />
            Recherche en cours…
          </div>
        </div>
      )}

      {showResultsBlock && !loading && error && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xl dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {showResultsBlock && !loading && !error && data && total === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-auto rounded-xl border border-slate-200/90 bg-slate-50/98 p-4 text-sm shadow-xl ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-800 dark:ring-white/10">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Aucun résultat pour « {debounced} »</p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            Essayez un nom de bien, un locataire, une ville, un libellé de charge ou une période (ex. 2026-03).
          </p>
        </div>
      )}

      {showResultsBlock && !loading && !error && total > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(72vh,32rem)] overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/98 text-sm shadow-2xl shadow-slate-900/8 ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-800 dark:shadow-black/40 dark:ring-white/10"
          id={listId}
          role="listbox"
          aria-label="Résultats de recherche"
          aria-activedescendant={listKeyboardActive ? `search-opt-${activeIdx}` : undefined}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-600">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {total} résultat{total > 1 ? 's' : ''}
            </p>
            <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
              <span className="hidden sm:inline">↑↓ naviguer · </span>Entrée ouvrir · Échap fermer
            </p>
          </div>
          <div className="max-h-[min(64vh,28rem)] overflow-y-auto overscroll-contain py-1">
            {(() => {
              let prevSection = '';
              return items.map((item, idx) => {
                const showHead = item.section !== prevSection;
                prevSection = item.section;
                const active = idx === activeIdx;
                const st = SECTION_STYLES[item.sectionVariant];
                return (
                  <Fragment key={item.key}>
                    {showHead && (
                      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200/70 bg-slate-100/95 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/98 dark:text-slate-300">
                        <span className={`h-3 w-1 shrink-0 rounded-full ${st.bar}`} aria-hidden />
                        {item.section}
                      </div>
                    )}
                    <button
                      type="button"
                      id={`search-opt-${idx}`}
                      role="option"
                      aria-selected={active}
                      data-search-idx={idx}
                      className={`flex w-full gap-3 px-3 py-2.5 text-left transition ${
                        active
                          ? 'bg-brand-50/90 ring-2 ring-inset ring-brand-300/80 dark:bg-brand-950/45 dark:ring-brand-600/50'
                          : 'hover:bg-slate-100/90 dark:hover:bg-slate-700/50'
                      }`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => go(item.href, debounced)}
                    >
                      <span className="mt-0.5 shrink-0">{st.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-slate-900 dark:text-slate-100">
                          <Highlight text={item.primary} needle={needle} />
                        </span>
                        <span
                          className="mt-0.5 block truncate text-xs text-slate-600 dark:text-slate-300"
                          title={item.secondary}
                        >
                          <Highlight text={item.secondary} needle={needle} />
                        </span>
                      </span>
                      {active && (
                        <span className="hidden shrink-0 self-center rounded border border-slate-200/90 bg-slate-100/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 sm:inline">
                          Entrée
                        </span>
                      )}
                    </button>
                  </Fragment>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
