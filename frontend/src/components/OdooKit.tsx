import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

export function OdooActionBar({
  left,
  right,
  className = '',
}: {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-600 dark:bg-zinc-900 ${className}`}
    >
      <div className="min-w-0 flex-1">{left}</div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>
    </div>
  );
}

export function OdooFormSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] dark:border-zinc-600 dark:bg-zinc-900 ${className}`}>
      <div className="border-b border-[var(--odoo-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)] dark:border-zinc-700 dark:text-zinc-400">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function OdooFormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

export function OdooFieldRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{label}</p>
        {hint ? <p className="text-[11px] text-[var(--color-muted)]">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export type OdooTabItem = {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
};

export type OdooTabVariant = 'underline' | 'chip';

export function OdooTabBar({
  tabs,
  activeId,
  onChange,
  right,
  className = '',
  variant = 'underline',
  ariaLabel,
}: {
  tabs: OdooTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  right?: ReactNode;
  className?: string;
  variant?: OdooTabVariant;
  ariaLabel?: string;
}) {
  if (!tabs.length) return null;

  return (
    <div className={`odoo-tab-bar odoo-tab-bar--${variant} ${className}`} role="tablist" aria-label={ariaLabel}>
      <div className="odoo-tab-bar__scroll">
        {tabs.map((t) => {
          const isActive = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={t.disabled}
              onClick={() => onChange(t.id)}
              className={`odoo-tab odoo-tab--${variant} ${isActive ? 'odoo-tab--active' : ''}`}
            >
              <span>{t.label}</span>
              {t.count !== undefined ? <span className="odoo-tab__count">{t.count}</span> : null}
            </button>
          );
        })}
      </div>
      {right ? <div className="odoo-tab-bar__right">{right}</div> : null}
    </div>
  );
}

export type OdooNotebookTab = { id: string; label: string; content: ReactNode };

export function OdooNotebook({
  tabs,
  defaultTabId,
  activeTabId,
  onTabChange,
  right,
}: {
  tabs: OdooNotebookTab[];
  defaultTabId?: string;
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  right?: ReactNode;
}) {
  const firstId = tabs[0]?.id;
  const initial = defaultTabId ?? firstId ?? '';
  const [internalActive, setInternalActive] = useState(initial);
  const controlled = activeTabId !== undefined;
  const active = controlled ? activeTabId : internalActive;

  useEffect(() => {
    if (!controlled && defaultTabId) setInternalActive(defaultTabId);
  }, [controlled, defaultTabId]);

  const activeTab = useMemo(() => tabs.find((t) => t.id === active) ?? tabs[0], [active, tabs]);

  function selectTab(id: string) {
    if (!controlled) setInternalActive(id);
    onTabChange?.(id);
  }

  if (!tabs.length) return null;

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-600 dark:bg-zinc-900">
      <OdooTabBar
        tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
        activeId={active}
        onChange={selectTab}
        right={right}
        ariaLabel="Sections"
      />
      <div className="odoo-notebook-content p-4 sm:p-5">{activeTab?.content}</div>
    </div>
  );
}

export function OdooSheetHeader({
  kicker,
  title,
  titleId,
  subtitle,
  onClose,
  closeLabel = 'Fermer',
  actions,
}: {
  kicker?: string;
  title: ReactNode;
  titleId?: string;
  subtitle?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="shrink-0 border-b border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/80 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {kicker ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">{kicker}</p>
          ) : null}
          <h2
            id={titleId}
            className={`${kicker ? 'mt-1' : ''} text-lg font-bold tracking-tight text-[var(--color-ink)] dark:text-zinc-50 sm:text-xl`}
          >
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {closeLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type OdooViewMode = 'list' | 'kanban';

export function OdooViewToggle({ value, onChange }: { value: OdooViewMode; onChange: (v: OdooViewMode) => void }) {
  return (
    <div className="odoo-segmented" role="group" aria-label="Mode d'affichage">
      {(
        [
          { id: 'list' as const, label: 'Liste' },
          { id: 'kanban' as const, label: 'Kanban' },
        ] as const
      ).map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`odoo-segmented__btn ${value === id ? 'odoo-segmented__btn--active' : ''}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function OdooSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={`relative min-w-[12rem] flex-1 sm:max-w-xs ${className}`}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--color-muted)]" aria-hidden>
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder ?? 'Rechercher'}
        autoComplete="off"
        className="w-full rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-white py-1.5 pl-8 pr-7 text-sm text-[var(--color-ink)] shadow-sm placeholder:text-[var(--color-muted)] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
      />
      {value.trim() ? (
        <button
          type="button"
          className="absolute right-1.5 top-1/2 z-[1] -translate-y-1/2 rounded p-0.5 text-[var(--color-muted)] hover:bg-slate-100 hover:text-[var(--color-ink)] dark:hover:bg-zinc-800"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function OdooListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filters,
  exports,
  viewMode,
  onViewModeChange,
  showViewToggle = false,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  filters?: ReactNode;
  exports?: ReactNode;
  viewMode?: OdooViewMode;
  onViewModeChange?: (v: OdooViewMode) => void;
  showViewToggle?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
      {search !== undefined && onSearchChange ? (
        <OdooSearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          ariaLabel={searchAriaLabel}
        />
      ) : null}
      {filters}
      {showViewToggle && viewMode !== undefined && onViewModeChange ? (
        <OdooViewToggle value={viewMode} onChange={onViewModeChange} />
      ) : null}
      {exports}
    </div>
  );
}

export function OdooKanbanBoard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 overflow-x-auto pb-1 ${className}`}>
      {children}
    </div>
  );
}

export function OdooKanbanColumn({
  title,
  count,
  children,
  className = '',
}: {
  title: string;
  count?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex w-[min(100%,18rem)] shrink-0 flex-col rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] dark:border-zinc-600 dark:bg-zinc-800/50 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--odoo-border)] px-3 py-2 dark:border-zinc-700">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink)] dark:text-zinc-100">{title}</p>
        {count !== undefined ? (
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--color-muted)] dark:bg-zinc-900">
            {count}
          </span>
        ) : null}
      </div>
      <div className="flex max-h-[min(70vh,36rem)] flex-col gap-2 overflow-y-auto p-2">{children}</div>
    </div>
  );
}

export function OdooKanbanCard({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-white p-2.5 text-left text-sm shadow-sm transition hover:border-brand-400/60 hover:shadow-md dark:border-zinc-600 dark:bg-zinc-900 dark:hover:border-brand-500/50 ${className}`}
    >
      {children}
    </Tag>
  );
}

