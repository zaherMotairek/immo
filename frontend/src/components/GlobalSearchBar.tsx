import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
  primary: string;
  secondary: string;
};

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
          <mark key={i} className="rounded px-0.5 font-medium text-inherit [background:linear-gradient(transparent_60%,rgb(253_224_71_/_0.65)_0)]">
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

export function GlobalSearchBar() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 220);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounced.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    api<SearchResponse>(`/search?q=${encodeURIComponent(debounced)}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
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
        primary: b.name,
        secondary: `${b.commune}, ${b.city}`,
      });
    }
    for (const t of data.tenants) {
      out.push({
        key: `t-${t.id}`,
        href: `/locataires?edit=${t.id}`,
        section: 'Locataires',
        primary: `${t.firstName} ${t.lastName}`.trim(),
        secondary: [t.phone, t.email].filter(Boolean).join(' · ') || '—',
      });
    }
    for (const u of data.units) {
      out.push({
        key: `u-${u.id}`,
        href: `/biens/${u.buildingId}`,
        section: 'Unités',
        primary: `Unité ${u.label} · ${unitKindLabel(u.kind)}`,
        secondary: `${u.building.name}, ${u.building.city}`,
      });
    }
    for (const l of data.leases) {
      out.push({
        key: `l-${l.id}`,
        href: `/locations/${l.id}`,
        section: 'Locations (baux)',
        primary: `${l.tenant.firstName} ${l.tenant.lastName}${!l.active ? ' (inactif)' : ''}`,
        secondary: `${l.unit.building.name} — ${l.unit.label}`,
      });
    }
    for (const c of data.charges) {
      out.push({
        key: `c-${c.id}`,
        href: `/charges?year=${c.periodYear}&focus=${c.id}`,
        section: 'Charges',
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
        primary: `${tenant.firstName} ${tenant.lastName} · ${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`,
        secondary: `${unit.building.name} — ${unit.label} · ${p.status} · ${fcfa(Number(p.amountDue))}`,
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        const t = e.target as HTMLElement;
        const tag = t.tagName;
        if ((tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') && t.id !== 'global-search') return;
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function go(to: string) {
    setOpen(false);
    setQuery('');
    setData(null);
    navigate(to);
  }

  const q = query.trim();
  const showPanel = open && q.length > 0;
  const showHint = showPanel && q.length === 1;
  const showResultsBlock = showPanel && q.length >= 2;
  const total = items.length;
  const needle = debounced;

  return (
    <div ref={wrapRef} className="relative z-50">
      <label className="sr-only" htmlFor="global-search">
        Recherche dans tout le programme ({SHORTCUT_HINT})
      </label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="global-search"
          type="search"
          autoComplete="off"
          placeholder={`Rechercher partout… · ${SHORTCUT_HINT}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showResultsBlock || items.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIdx((i) => Math.min(items.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              const item = items[activeIdx];
              if (item) {
                e.preventDefault();
                go(item.href);
              }
            }
          }}
          className="w-full border-slate-300 bg-white py-2.5 pr-24 shadow-sm"
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-xs text-slate-500">
            <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden />
            <span className="hidden sm:inline">Recherche…</span>
          </span>
        )}
      </div>

      {showHint && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-xl ring-1 ring-slate-900/5">
          Tapez encore une lettre pour lancer la recherche (minimum 2 caractères).
        </div>
      )}

      {showResultsBlock && loading && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-xl ring-1 ring-slate-900/5">
          Recherche en cours…
        </div>
      )}

      {showResultsBlock && !loading && data && total === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-xl ring-1 ring-slate-900/5">
          Aucun résultat pour « {debounced} ».
        </div>
      )}

      {showResultsBlock && !loading && total > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,28rem)] overflow-auto rounded-xl border border-slate-200 bg-white py-2 text-sm shadow-xl ring-1 ring-slate-900/5">
          <p className="border-b border-slate-100 px-4 pb-2 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {total} résultat{total > 1 ? 's' : ''} · flèches + Entrée
          </p>
          {(() => {
            let prevSection = '';
            return items.map((item, idx) => {
              const showHead = item.section !== prevSection;
              prevSection = item.section;
              const active = idx === activeIdx;
              return (
                <Fragment key={item.key}>
                  {showHead && (
                    <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
                      {item.section}
                    </div>
                  )}
                  <button
                    type="button"
                    data-search-idx={idx}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition ${
                      active ? 'bg-brand-50 ring-1 ring-inset ring-brand-200/80' : 'hover:bg-slate-50'
                    }`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => go(item.href)}
                  >
                    <span className="font-medium text-slate-900">
                      <Highlight text={item.primary} needle={needle} />
                    </span>
                    <span className="text-xs text-slate-500">
                      <Highlight text={item.secondary} needle={needle} />
                    </span>
                  </button>
                </Fragment>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
